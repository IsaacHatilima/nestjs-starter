import { listSessions } from '@tests/setup/sessions';
import { login, registerAndLogin, USER_AGENT, useTestApp } from '@tests/setup/test-app';

const ctx = useTestApp();

describe('GET /auth/list-sessions (e2e)', () => {
  it('lists active sessions and marks the caller', async () => {
    const { t } = ctx;
    const first = await registerAndLogin(t, 'ada@example.com');
    const second = await login(t, 'ada@example.com');

    const seenByFirst = await listSessions(t, first.accessToken);
    const seenBySecond = await listSessions(t, second.accessToken);

    expect(seenByFirst).toHaveLength(2);
    expect(seenByFirst.filter((s) => s.current)).toHaveLength(1);
    expect(seenByFirst.find((s) => s.current)?.id).not.toBe(seenBySecond.find((s) => s.current)?.id);
  });

  it('records the user agent and address of each session', async () => {
    const { t } = ctx;
    const { accessToken } = await registerAndLogin(t, 'ada@example.com');

    const [session] = await listSessions(t, accessToken);

    expect(session.userAgent).toBe(USER_AGENT);
    expect(session.ip).toEqual(expect.any(String));
  });
});
