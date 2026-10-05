import {
  bearer,
  errorCodeOf,
  lastMailToken,
  login,
  PASSWORD,
  registerAndLogin,
  TestApp,
  useTestApp,
} from '@tests/setup/test-app';

const ctx = useTestApp();
const NEW_PASSWORD = 'a completely new password';

async function requestReset(t: TestApp, email: string): Promise<string> {
  await t.http().post('/auth/forgot-password').send({ email }).expect(200);
  return lastMailToken(t.mail);
}

describe('POST /auth/reset-password (e2e)', () => {
  it('sets the new password and signs every session out', async () => {
    const { t } = ctx;
    const session = await registerAndLogin(t, 'ada@example.com');
    const token = await requestReset(t, 'ada@example.com');

    await t.http().post('/auth/reset-password').send({ token, password: NEW_PASSWORD }).expect(200);

    const revoked = await t.http().get('/auth/me').set(bearer(session.accessToken)).expect(401);
    expect(errorCodeOf(revoked)).toBe('SESSION_REVOKED');
    await t.http().post('/auth/login').send({ email: 'ada@example.com', password: PASSWORD }).expect(401);
    await login(t, 'ada@example.com', NEW_PASSWORD);
  });

  it('accepts each reset token only once', async () => {
    const { t } = ctx;
    await registerAndLogin(t, 'ada@example.com');
    const token = await requestReset(t, 'ada@example.com');
    await t.http().post('/auth/reset-password').send({ token, password: NEW_PASSWORD }).expect(200);

    const reused = await t
      .http()
      .post('/auth/reset-password')
      .send({ token, password: 'another new password' })
      .expect(401);

    expect(errorCodeOf(reused)).toBe('INVALID_TOKEN');
  });
});
