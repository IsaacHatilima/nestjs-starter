import { generate } from 'otplib';
import { ErrorCode } from '@/common/errors/error-codes';
import { securityServices } from '@tests/setup/security.fixture';
import { SESSION_ID, USER_ID } from '@tests/setup/user.fixture';
import { EnableTotpRepository } from '@/auth/enable-totp/repositories/EnableTotp.repository';
import { EnableTotpService } from '@/auth/enable-totp/services/EnableTotp.service';

const { totp, cipher, recovery } = securityServices();
const auth = { userId: USER_ID, sessionId: SESSION_ID };

function build(
  user: {
    twoFactorEnabled: boolean;
    twoFactorPendingSecret: string | null;
  } | null,
) {
  const repository = {
    findById: jest.fn().mockResolvedValue(user),
    enable: jest.fn().mockResolvedValue(undefined),
  };
  const service = new EnableTotpService(repository as unknown as EnableTotpRepository, totp, cipher, recovery);
  return { repository, service };
}

describe('EnableTotpService', () => {
  it('promotes the pending secret and returns one-time recovery codes', async () => {
    const secret = totp.generateSecret();
    const pending = cipher.encrypt(secret);
    const { repository, service } = build({
      twoFactorEnabled: false,
      twoFactorPendingSecret: pending,
    });

    const result = await service.handle(auth, {
      code: await generate({ secret }),
    });

    expect(result.recoveryCodes).toHaveLength(10);
    const [userId, input] = repository.enable.mock.calls[0] as [
      string,
      { secret: string; lastUsedStep: number; recoveryCodeHashes: string[] },
    ];
    expect(userId).toBe(USER_ID);
    expect(input.secret).toBe(pending);
    expect(input.lastUsedStep).toBe(Math.floor(Date.now() / 1000 / 30));
    expect(input.recoveryCodeHashes).toEqual(result.recoveryCodes.map((c) => recovery.hash(c)));
  });

  it('rejects a wrong confirmation code', async () => {
    const pending = cipher.encrypt(totp.generateSecret());
    const { repository, service } = build({
      twoFactorEnabled: false,
      twoFactorPendingSecret: pending,
    });

    await expect(service.handle(auth, { code: '000000' })).rejects.toMatchObject({
      code: ErrorCode.INVALID_TWO_FACTOR_CODE,
    });
    expect(repository.enable).not.toHaveBeenCalled();
  });

  it('requires setup to have run first', async () => {
    const { service } = build({
      twoFactorEnabled: false,
      twoFactorPendingSecret: null,
    });

    await expect(service.handle(auth, { code: '000000' })).rejects.toMatchObject({
      code: ErrorCode.TWO_FACTOR_NOT_SETUP,
    });
  });

  it('refuses when already enabled', async () => {
    const { service } = build({
      twoFactorEnabled: true,
      twoFactorPendingSecret: null,
    });

    await expect(service.handle(auth, { code: '000000' })).rejects.toMatchObject({
      code: ErrorCode.TWO_FACTOR_ALREADY_ENABLED,
    });
  });
});
