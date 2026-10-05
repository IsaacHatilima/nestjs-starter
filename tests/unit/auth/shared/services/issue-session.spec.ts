import { securityServices } from '@tests/setup/security.fixture';
import { META, SESSION_ID, USER_ID } from '@tests/setup/user.fixture';
import { issueSession } from '@/auth/shared/services/issue-session';
import { firstArg } from '@tests/setup/mock-calls';

const { tokens } = securityServices();

describe('issueSession', () => {
  it('stores a hashed refresh token and returns a verifiable access token', async () => {
    const store = {
      create: jest.fn().mockResolvedValue({ id: SESSION_ID }),
    };

    const pair = await issueSession(tokens, store, USER_ID, META);

    const stored = firstArg<{
      userId: string;
      refreshTokenHash: string;
      expiresAt: Date;
      ip: string | null;
      userAgent: string | null;
    }>(store.create);
    expect(stored.userId).toBe(USER_ID);
    expect(stored.refreshTokenHash).toBe(tokens.hashOpaqueToken(pair.refreshToken));
    expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(stored.ip).toBe('127.0.0.1');
    expect(stored.userAgent).toBe('jest');
    await expect(tokens.verifyAccessToken(pair.accessToken)).resolves.toEqual({
      userId: USER_ID,
      sessionId: SESSION_ID,
    });
  });
});
