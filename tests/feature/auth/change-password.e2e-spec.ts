import { bearer, errorCodeOf, login, PASSWORD, registerAndLogin, useTestApp } from '@tests/setup/test-app';

const ctx = useTestApp();
const NEW_PASSWORD = 'a completely new password';

describe('POST /auth/change-password (e2e)', () => {
  it('changes the password and keeps only the current session alive', async () => {
    const { t } = ctx;
    const current = await registerAndLogin(t, 'ada@example.com');
    const other = await login(t, 'ada@example.com');

    await t
      .http()
      .post('/auth/change-password')
      .set(bearer(current.accessToken))
      .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD })
      .expect(204);

    await t.http().get('/auth/me').set(bearer(current.accessToken)).expect(200);
    await t.http().get('/auth/me').set(bearer(other.accessToken)).expect(401);
    await login(t, 'ada@example.com', NEW_PASSWORD);
  });

  it('rejects a wrong current password', async () => {
    const { t } = ctx;
    const { accessToken } = await registerAndLogin(t, 'ada@example.com');

    const response = await t
      .http()
      .post('/auth/change-password')
      .set(bearer(accessToken))
      .send({ currentPassword: 'wrong', newPassword: NEW_PASSWORD })
      .expect(401);

    expect(errorCodeOf(response)).toBe('INVALID_CREDENTIALS');
    await login(t, 'ada@example.com', PASSWORD);
  });
});
