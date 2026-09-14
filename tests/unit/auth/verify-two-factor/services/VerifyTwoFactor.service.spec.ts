import { generate } from 'otplib';
import { ErrorCode } from '@/common/errors/error-codes';
import { securityServices } from '@tests/setup/security.fixture';
import { credentials, META, profile, SESSION_ID, USER_ID } from '@tests/setup/user.fixture';
import { VerifyTwoFactorRepository } from '@/auth/verify-two-factor/repositories/VerifyTwoFactor.repository';
import { VerifyTwoFactorService } from '@/auth/verify-two-factor/services/VerifyTwoFactor.service';

const { tokens, cipher, totp, verifier } = securityServices();

function build() {
  const repository = {
    findCredentialsById: jest.fn().mockResolvedValue(null),
    findProfile: jest.fn().mockResolvedValue(profile()),
    recordTotpStep: jest.fn().mockResolvedValue(true),
    consumeRecoveryCode: jest.fn().mockResolvedValue(false),
    createSession: jest.fn().mockResolvedValue({ id: SESSION_ID }),
  };
  const service = new VerifyTwoFactorService(repository as unknown as VerifyTwoFactorRepository, tokens, verifier);
  return { repository, service };
}

describe('VerifyTwoFactorService', () => {
  it('completes login with a valid authenticator code', async () => {
    const { repository, service } = build();
    const secret = totp.generateSecret();
    repository.findCredentialsById.mockResolvedValue(
      credentials({
        twoFactorEnabled: true,
        twoFactorSecret: cipher.encrypt(secret),
      }),
    );
    const challengeToken = await tokens.signTwoFactorChallenge(USER_ID);

    const result = await service.handle({ challengeToken, code: await generate({ secret }) }, META);

    expect(result.status).toBe('authenticated');
    expect(result.user.twoFactorEnabled).toBe(true);
    expect(result.user.profile).toEqual({ firstName: 'Ada', lastName: 'Lovelace', avatarUrl: null });
    await expect(tokens.verifyAccessToken(result.accessToken)).resolves.toEqual({
      userId: USER_ID,
      sessionId: SESSION_ID,
    });
    expect(repository.recordTotpStep).toHaveBeenCalledWith(USER_ID, expect.any(Number));
  });

  it('completes login with an unused recovery code', async () => {
    const { repository, service } = build();
    repository.findCredentialsById.mockResolvedValue(
      credentials({
        twoFactorEnabled: true,
        twoFactorSecret: cipher.encrypt(totp.generateSecret()),
      }),
    );
    repository.consumeRecoveryCode.mockResolvedValue(true);
    const challengeToken = await tokens.signTwoFactorChallenge(USER_ID);

    await expect(service.handle({ challengeToken, code: 'abcde-fgh23' }, META)).resolves.toMatchObject({
      status: 'authenticated',
    });
  });

  it('rejects a wrong code', async () => {
    const { repository, service } = build();
    repository.findCredentialsById.mockResolvedValue(
      credentials({
        twoFactorEnabled: true,
        twoFactorSecret: cipher.encrypt(totp.generateSecret()),
      }),
    );
    const challengeToken = await tokens.signTwoFactorChallenge(USER_ID);

    await expect(service.handle({ challengeToken, code: '000000' }, META)).rejects.toMatchObject({
      code: ErrorCode.INVALID_TWO_FACTOR_CODE,
    });
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it('rejects an access token used as a challenge', async () => {
    const { service } = build();
    const accessToken = await tokens.signAccessToken({
      userId: USER_ID,
      sessionId: SESSION_ID,
    });

    await expect(service.handle({ challengeToken: accessToken, code: '000000' }, META)).rejects.toMatchObject({
      code: ErrorCode.INVALID_TOKEN,
    });
  });

  it('rejects when the user no longer has two-factor enabled', async () => {
    const { repository, service } = build();
    repository.findCredentialsById.mockResolvedValue(credentials({ twoFactorEnabled: false }));
    const challengeToken = await tokens.signTwoFactorChallenge(USER_ID);

    await expect(service.handle({ challengeToken, code: '000000' }, META)).rejects.toMatchObject({
      code: ErrorCode.TWO_FACTOR_NOT_ENABLED,
    });
  });
});
