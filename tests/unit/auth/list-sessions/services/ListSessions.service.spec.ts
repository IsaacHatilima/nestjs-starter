import { NOW, OTHER_SESSION_ID, SESSION_ID, USER_ID } from '@tests/setup/user.fixture';
import { ListSessionsRepository } from '@/auth/list-sessions/repositories/ListSessions.repository';
import { ListSessionsService } from '@/auth/list-sessions/services/ListSessions.service';

const auth = { userId: USER_ID, sessionId: SESSION_ID };

describe('ListSessionsService', () => {
  it('lists active sessions and flags the one making the call', async () => {
    const repository = {
      findActiveByUser: jest.fn().mockResolvedValue([
        {
          id: SESSION_ID,
          ip: '127.0.0.1',
          userAgent: 'jest',
          createdAt: NOW,
          lastUsedAt: NOW,
          expiresAt: NOW,
        },
        {
          id: OTHER_SESSION_ID,
          ip: null,
          userAgent: null,
          createdAt: NOW,
          lastUsedAt: NOW,
          expiresAt: NOW,
        },
      ]),
    };
    const service = new ListSessionsService(repository as unknown as ListSessionsRepository);

    const sessions = await service.handle(auth);

    expect(repository.findActiveByUser).toHaveBeenCalledWith(USER_ID);
    expect(sessions.map((s) => [s.id, s.current])).toEqual([
      [SESSION_ID, true],
      [OTHER_SESSION_ID, false],
    ]);
    expect(sessions[0].createdAt).toBe(NOW.toISOString());
  });
});
