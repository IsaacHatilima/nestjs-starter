import { enroll, codeAfter } from '@tests/setup/two-factor';
import { bearer, dataOf, errorCodeOf, PASSWORD, registerAndLogin, useTestApp } from '@tests/setup/test-app';

const ctx = useTestApp();

describe('POST /auth/disable-totp (e2e)', () => {
  it('turns two-factor off after checking password and code, so login is direct again', async () => {
    const { t } = ctx;
    const { accessToken } = await registerAndLogin(t, 'ada@example.com');
    const { secret, step } = await enroll(t, accessToken);

    await t
      .http()
      .post('/auth/disable-totp')
      .set(bearer(accessToken))
      .send({ password: PASSWORD, code: await codeAfter(secret, step) })
      .expect(200);

    const login = await t.http().post('/auth/login').send({ email: 'ada@example.com', password: PASSWORD }).expect(200);
    expect(dataOf<{ status: string }>(login).status).toBe('authenticated');
  });

  it('rejects a wrong password', async () => {
    const { t } = ctx;
    const { accessToken } = await registerAndLogin(t, 'ada@example.com');
    const { secret, step } = await enroll(t, accessToken);

    const response = await t
      .http()
      .post('/auth/disable-totp')
      .set(bearer(accessToken))
      .send({ password: 'wrong', code: await codeAfter(secret, step) })
      .expect(401);

    expect(errorCodeOf(response)).toBe('INVALID_CREDENTIALS');
  });

  it('refuses when two-factor is not enabled', async () => {
    const { t } = ctx;
    const { accessToken } = await registerAndLogin(t, 'ada@example.com');

    const response = await t
      .http()
      .post('/auth/disable-totp')
      .set(bearer(accessToken))
      .send({ password: PASSWORD, code: '123456' })
      .expect(400);

    expect(errorCodeOf(response)).toBe('TWO_FACTOR_NOT_ENABLED');
  });
});
