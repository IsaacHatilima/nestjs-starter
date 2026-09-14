import { ErrorCode } from '@/common/errors/error-codes';
import { OTHER_SESSION_ID, SESSION_ID, USER_ID } from '@tests/setup/user.fixture';
import { RevokeSessionRepository } from '@/auth/revoke-session/repositories/RevokeSession.repository';
import { RevokeSessionService } from '@/auth/revoke-session/services/RevokeSession.service';

const auth = { userId: USER_ID, sessionId: SESSION_ID };

describe('RevokeSessionService', () => {
  it('revokes a session the caller owns', async () => {
    const repository = { revokeOwned: jest.fn().mockResolvedValue(true) };
    const service = new RevokeSessionService(repository as unknown as RevokeSessionRepository);

    await expect(service.handle(auth, { sessionId: OTHER_SESSION_ID })).resolves.toBeUndefined();

    expect(repository.revokeOwned).toHaveBeenCalledWith(USER_ID, OTHER_SESSION_ID);
  });

  it("reports someone else's or an unknown session as not found", async () => {
    const repository = { revokeOwned: jest.fn().mockResolvedValue(false) };
    const service = new RevokeSessionService(repository as unknown as RevokeSessionRepository);

    await expect(service.handle(auth, { sessionId: OTHER_SESSION_ID })).rejects.toMatchObject({
      code: ErrorCode.NOT_FOUND,
    });
  });
});
