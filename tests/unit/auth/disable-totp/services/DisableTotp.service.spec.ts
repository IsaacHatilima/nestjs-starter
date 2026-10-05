import { UserRepository } from '@/auth/shared/repositories/User.repository';
import { RecoveryCodeRepository } from '@/auth/shared/repositories/RecoveryCode.repository';
import { generate } from 'otplib';
import { ErrorCode } from '@/common/errors/error-codes';
import { securityServices } from '@tests/setup/security.fixture';
import { credentials, SESSION_ID, USER_ID } from '@tests/setup/user.fixture';
import { DisableTotpRepository } from '@/auth/disable-totp/repositories/DisableTotp.repository';
import { DisableTotpService } from '@/auth/disable-totp/services/DisableTotp.service';

const { hasher, cipher, totp, verifier } = securityServices();
const auth = { userId: USER_ID, sessionId: SESSION_ID };
const PASSWORD = 'correct horse battery';
let passwordHash: string;
beforeAll(async () => {
  passwordHash = await hasher.hash(PASSWORD);
});

function build(secret: string, enabled = true) {
  const userRepository = {
    findById: jest.fn().mockResolvedValue(
      credentials({
        passwordHash,
        twoFactorEnabled: enabled,
        twoFactorSecret: cipher.encrypt(secret),
      }),
    ),
    recordTotpStep: jest.fn().mockResolvedValue(true),
  };
  const codeRepository = { consume: jest.fn().mockResolvedValue(false) };
  const repository = { disable: jest.fn().mockResolvedValue(undefined) };
  const service = new DisableTotpService(
    repository as unknown as DisableTotpRepository,
    userRepository as unknown as UserRepository,
    codeRepository as unknown as RecoveryCodeRepository,
    hasher,
    verifier,
  );
  return { repository, userRepository, codeRepository, service };
}

describe('DisableTotpService', () => {
  it('disables after checking both the password and a current code', async () => {
    const secret = totp.generateSecret();
    const { repository, service } = build(secret);

    await service.handle(auth, {
      password: PASSWORD,
      code: await generate({ secret }),
    });

    expect(repository.disable).toHaveBeenCalledWith(USER_ID);
  });

  it('rejects a wrong password before touching the code', async () => {
    const secret = totp.generateSecret();
    const { repository, service } = build(secret);

    await expect(
      service.handle(auth, {
        password: 'wrong',
        code: await generate({ secret }),
      }),
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_CREDENTIALS });
    expect(repository.disable).not.toHaveBeenCalled();
  });

  it('rejects a wrong code', async () => {
    const { repository, service } = build(totp.generateSecret());

    await expect(service.handle(auth, { password: PASSWORD, code: '000000' })).rejects.toMatchObject({
      code: ErrorCode.INVALID_TWO_FACTOR_CODE,
    });
    expect(repository.disable).not.toHaveBeenCalled();
  });

  it('refuses when two-factor is not enabled', async () => {
    const { service } = build(totp.generateSecret(), false);

    await expect(service.handle(auth, { password: PASSWORD, code: '000000' })).rejects.toMatchObject({
      code: ErrorCode.TWO_FACTOR_NOT_ENABLED,
    });
  });
});
