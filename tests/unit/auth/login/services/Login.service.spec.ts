import { ErrorCode } from '@/common/errors/error-codes';
import { securityServices } from '@tests/setup/security.fixture';
import { credentials, META, profile, SESSION_ID, USER_ID } from '@tests/setup/user.fixture';
import { LoginRepository } from '@/auth/login/repositories/Login.repository';
import { LoginService } from '@/auth/login/services/Login.service';

const { env, hasher, tokens } = securityServices();
const PASSWORD = 'correct horse battery';
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hasher.hash(PASSWORD);
});

function build(requireVerification = true) {
  const repository = {
    findCredentialsByEmail: jest.fn().mockResolvedValue(null),
    findProfile: jest.fn().mockResolvedValue(profile()),
    createSession: jest.fn().mockResolvedValue({ id: SESSION_ID }),
  };
  const service = new LoginService(repository as unknown as LoginRepository, hasher, tokens, {
    ...env,
    REQUIRE_EMAIL_VERIFICATION: requireVerification,
  });
  return { repository, service };
}

describe('LoginService', () => {
  it('issues a session and tokens for valid credentials', async () => {
    const { repository, service } = build();
    repository.findCredentialsByEmail.mockResolvedValue(credentials({ passwordHash }));

    const result = await service.handle({ email: 'ada@example.com', password: PASSWORD }, META);

    if (result.status !== 'authenticated') throw new Error('expected authenticated');
    expect(result.user).toMatchObject({
      id: USER_ID,
      email: 'ada@example.com',
      profile: { firstName: 'Ada', lastName: 'Lovelace', avatarUrl: null },
    });
    expect(result.user).not.toHaveProperty('passwordHash');
    await expect(tokens.verifyAccessToken(result.accessToken)).resolves.toEqual({
      userId: USER_ID,
      sessionId: SESSION_ID,
    });
    expect(repository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        ip: '127.0.0.1',
        userAgent: 'jest',
      }),
    );
  });

  it('never creates a session when the profile is missing', async () => {
    const { repository, service } = build();
    repository.findCredentialsByEmail.mockResolvedValue(credentials({ passwordHash }));
    repository.findProfile.mockResolvedValue(null);

    await expect(service.handle({ email: 'ada@example.com', password: PASSWORD }, META)).rejects.toMatchObject({
      code: ErrorCode.NOT_FOUND,
    });
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it('rejects an unknown email with the same error as a wrong password', async () => {
    const { service } = build();

    await expect(service.handle({ email: 'nobody@example.com', password: PASSWORD }, META)).rejects.toMatchObject({
      code: ErrorCode.INVALID_CREDENTIALS,
    });
  });

  it('rejects a wrong password', async () => {
    const { repository, service } = build();
    repository.findCredentialsByEmail.mockResolvedValue(credentials({ passwordHash }));

    await expect(service.handle({ email: 'ada@example.com', password: 'wrong' }, META)).rejects.toMatchObject({
      code: ErrorCode.INVALID_CREDENTIALS,
    });
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it('blocks unverified emails when verification is required', async () => {
    const { repository, service } = build(true);
    repository.findCredentialsByEmail.mockResolvedValue(credentials({ passwordHash, emailVerifiedAt: null }));

    await expect(service.handle({ email: 'ada@example.com', password: PASSWORD }, META)).rejects.toMatchObject({
      code: ErrorCode.EMAIL_NOT_VERIFIED,
    });
  });

  it('lets unverified emails in when verification is optional', async () => {
    const { repository, service } = build(false);
    repository.findCredentialsByEmail.mockResolvedValue(credentials({ passwordHash, emailVerifiedAt: null }));

    await expect(service.handle({ email: 'ada@example.com', password: PASSWORD }, META)).resolves.toMatchObject({
      status: 'authenticated',
    });
  });

  it('returns a two-factor challenge instead of tokens when 2FA is enabled', async () => {
    const { repository, service } = build();
    repository.findCredentialsByEmail.mockResolvedValue(
      credentials({
        passwordHash,
        twoFactorEnabled: true,
        twoFactorSecret: 'enc',
      }),
    );

    const result = await service.handle({ email: 'ada@example.com', password: PASSWORD }, META);

    if (result.status !== 'two_factor_required') throw new Error('expected challenge');
    await expect(tokens.verifyTwoFactorChallenge(result.challengeToken)).resolves.toEqual({
      userId: USER_ID,
    });
    expect(repository.createSession).not.toHaveBeenCalled();
  });
});
