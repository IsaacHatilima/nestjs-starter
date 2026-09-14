import { SESSION_ID, USER_ID } from '@tests/setup/user.fixture';
import { RevokeOtherSessionsRepository } from '@/auth/revoke-other-sessions/repositories/RevokeOtherSessions.repository';
import { RevokeOtherSessionsService } from '@/auth/revoke-other-sessions/services/RevokeOtherSessions.service';

describe('RevokeOtherSessionsService', () => {
  it('revokes every session of the caller except the current one', async () => {
    const repository = {
      revokeAllExcept: jest.fn().mockResolvedValue(undefined),
    };
    const service = new RevokeOtherSessionsService(repository as unknown as RevokeOtherSessionsRepository);

    await service.handle({ userId: USER_ID, sessionId: SESSION_ID });

    expect(repository.revokeAllExcept).toHaveBeenCalledWith(USER_ID, SESSION_ID);
  });
});
