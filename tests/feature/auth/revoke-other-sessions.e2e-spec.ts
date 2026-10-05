import { listSessions } from '@tests/setup/sessions';
import { bearer, login, registerAndLogin, useTestApp } from '@tests/setup/test-app';

const ctx = useTestApp();

describe('POST /auth/revoke-other-sessions (e2e)', () => {
  it('revokes every other session but keeps the caller signed in', async () => {
    const { t } = ctx;
    const mine = await registerAndLogin(t, 'ada@example.com');
    const second = await login(t, 'ada@example.com');
    const third = await login(t, 'ada@example.com');

    await t.http().post('/auth/revoke-other-sessions').set(bearer(mine.accessToken)).expect(200);

    const remaining = await listSessions(t, mine.accessToken);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].current).toBe(true);
    await t.http().get('/auth/me').set(bearer(second.accessToken)).expect(401);
    await t.http().get('/auth/me').set(bearer(third.accessToken)).expect(401);
  });
});
