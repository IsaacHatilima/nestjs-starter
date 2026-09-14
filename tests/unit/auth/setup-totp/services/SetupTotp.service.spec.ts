import { ErrorCode } from '@/common/errors/error-codes';
import { securityServices } from '@tests/setup/security.fixture';
import { SESSION_ID, USER_ID } from '@tests/setup/user.fixture';
import { SetupTotpRepository } from '@/auth/setup-totp/repositories/SetupTotp.repository';
import { SetupTotpService } from '@/auth/setup-totp/services/SetupTotp.service';

const { totp, cipher } = securityServices();
const auth = { userId: USER_ID, sessionId: SESSION_ID };

function build(user: { email: string; twoFactorEnabled: boolean } | null) {
  const repository = {
    findById: jest.fn().mockResolvedValue(user),
    savePendingSecret: jest.fn().mockResolvedValue(undefined),
  };
  return {
    repository,
    service: new SetupTotpService(repository as unknown as SetupTotpRepository, totp, cipher),
  };
}

describe('SetupTotpService', () => {
  it('stores an encrypted pending secret and returns provisioning details', async () => {
    const { repository, service } = build({
      email: 'ada@example.com',
      twoFactorEnabled: false,
    });

    const setup = await service.handle(auth);

    const [userId, encrypted] = repository.savePendingSecret.mock.calls[0] as [string, string];
    expect(userId).toBe(USER_ID);
    expect(encrypted).not.toContain(setup.secret);
    expect(cipher.decrypt(encrypted)).toBe(setup.secret);
    expect(setup.otpauthUrl).toContain(`secret=${setup.secret}`);
    expect(setup.otpauthUrl).toContain('issuer=ZITD');
    expect(setup.qrCodeDataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('refuses when two-factor is already enabled', async () => {
    const { repository, service } = build({
      email: 'ada@example.com',
      twoFactorEnabled: true,
    });

    await expect(service.handle(auth)).rejects.toMatchObject({
      code: ErrorCode.TWO_FACTOR_ALREADY_ENABLED,
    });
    expect(repository.savePendingSecret).not.toHaveBeenCalled();
  });
});
