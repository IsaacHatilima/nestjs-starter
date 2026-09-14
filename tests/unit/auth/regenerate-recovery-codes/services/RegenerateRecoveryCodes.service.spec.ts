import { generate } from 'otplib';
import { ErrorCode } from '@/common/errors/error-codes';
import { securityServices } from '@tests/setup/security.fixture';
import { credentials, SESSION_ID, USER_ID } from '@tests/setup/user.fixture';
import { RegenerateRecoveryCodesRepository } from '@/auth/regenerate-recovery-codes/repositories/RegenerateRecoveryCodes.repository';
import { RegenerateRecoveryCodesService } from '@/auth/regenerate-recovery-codes/services/RegenerateRecoveryCodes.service';

const { hasher, cipher, totp, verifier, recovery } = securityServices();
const auth = { userId: USER_ID, sessionId: SESSION_ID };
const PASSWORD = 'correct horse battery';
let passwordHash: string;
beforeAll(async () => {
  passwordHash = await hasher.hash(PASSWORD);
});

function build(secret: string) {
  const repository = {
    findCredentialsById: jest.fn().mockResolvedValue(
      credentials({
        passwordHash,
        twoFactorEnabled: true,
        twoFactorSecret: cipher.encrypt(secret),
      }),
    ),
    recordTotpStep: jest.fn().mockResolvedValue(true),
    consumeRecoveryCode: jest.fn().mockResolvedValue(false),
    replaceRecoveryCodes: jest.fn().mockResolvedValue(undefined),
  };
  const service = new RegenerateRecoveryCodesService(
    repository as unknown as RegenerateRecoveryCodesRepository,
    hasher,
    verifier,
    recovery,
  );
  return { repository, service };
}

describe('RegenerateRecoveryCodesService', () => {
  it('replaces every recovery code after password and code checks', async () => {
    const secret = totp.generateSecret();
    const { repository, service } = build(secret);

    const result = await service.handle(auth, {
      password: PASSWORD,
      code: await generate({ secret }),
    });

    expect(result.recoveryCodes).toHaveLength(10);
    expect(repository.replaceRecoveryCodes).toHaveBeenCalledWith(
      USER_ID,
      result.recoveryCodes.map((code) => recovery.hash(code)),
    );
  });

  it('rejects a wrong code', async () => {
    const { repository, service } = build(totp.generateSecret());

    await expect(service.handle(auth, { password: PASSWORD, code: '000000' })).rejects.toMatchObject({
      code: ErrorCode.INVALID_TWO_FACTOR_CODE,
    });
    expect(repository.replaceRecoveryCodes).not.toHaveBeenCalled();
  });
});
