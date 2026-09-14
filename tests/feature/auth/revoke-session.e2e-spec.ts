import { listSessions } from '@tests/setup/sessions';
import { bearer, errorCodeOf, login, registerAndLogin, useTestApp } from '@tests/setup/test-app';

const ctx = useTestApp();

describe('POST /auth/revoke-session (e2e)', () => {
  it('revokes one of the caller sessions', async () => {
    const { t } = ctx;
    const mine = await registerAndLogin(t, 'ada@example.com');
    const other = await login(t, 'ada@example.com');
    const otherId = (await listSessions(t, mine.accessToken)).find((s) => !s.current)?.id;

    await t.http().post('/auth/revoke-session').set(bearer(mine.accessToken)).send({ sessionId: otherId }).expect(204);

    expect(await listSessions(t, mine.accessToken)).toHaveLength(1);
    await t.http().get('/auth/me').set(bearer(other.accessToken)).expect(401);
  });

  it("reports someone else's session as not found and leaves it alive", async () => {
    const { t } = ctx;
    const mine = await registerAndLogin(t, 'ada@example.com');
    const stranger = await registerAndLogin(t, 'bob@example.com');
    const [strangerSession] = await listSessions(t, stranger.accessToken);

    const response = await t
      .http()
      .post('/auth/revoke-session')
      .set(bearer(mine.accessToken))
      .send({ sessionId: strangerSession.id })
      .expect(404);

    expect(errorCodeOf(response)).toBe('NOT_FOUND');
    await t.http().get('/auth/me').set(bearer(stranger.accessToken)).expect(200);
  });

  it('validates the session id', async () => {
    const { t } = ctx;
    const { accessToken } = await registerAndLogin(t, 'ada@example.com');

    const response = await t
      .http()
      .post('/auth/revoke-session')
      .set(bearer(accessToken))
      .send({ sessionId: 'not-a-uuid' })
      .expect(400);

    expect(errorCodeOf(response)).toBe('VALIDATION_ERROR');
  });
});
