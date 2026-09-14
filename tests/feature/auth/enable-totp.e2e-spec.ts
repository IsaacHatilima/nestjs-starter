import { generate } from 'otplib';
import { setupTotp } from '@tests/setup/two-factor';
import { bearer, dataOf, errorCodeOf, registerAndLogin, useTestApp } from '@tests/setup/test-app';

const ctx = useTestApp();

describe('POST /auth/enable-totp (e2e)', () => {
  it('turns two-factor on and hands out ten recovery codes once', async () => {
    const { t } = ctx;
    const { accessToken } = await registerAndLogin(t, 'ada@example.com');
    const { secret } = await setupTotp(t, accessToken);

    const response = await t
      .http()
      .post('/auth/enable-totp')
      .set(bearer(accessToken))
      .send({ code: await generate({ secret }) })
      .expect(200);

    expect(dataOf<{ recoveryCodes: string[] }>(response).recoveryCodes).toHaveLength(10);
    const me = await t.http().get('/auth/me').set(bearer(accessToken)).expect(200);
    expect(dataOf<{ twoFactorEnabled: boolean }>(me).twoFactorEnabled).toBe(true);
  });

  it('rejects a wrong confirmation code', async () => {
    const { t } = ctx;
    const { accessToken } = await registerAndLogin(t, 'ada@example.com');
    await setupTotp(t, accessToken);

    const response = await t
      .http()
      .post('/auth/enable-totp')
      .set(bearer(accessToken))
      .send({ code: '000000' })
      .expect(401);

    expect(errorCodeOf(response)).toBe('INVALID_TWO_FACTOR_CODE');
  });

  it('requires setup to have run first', async () => {
    const { t } = ctx;
    const { accessToken } = await registerAndLogin(t, 'ada@example.com');

    const response = await t
      .http()
      .post('/auth/enable-totp')
      .set(bearer(accessToken))
      .send({ code: '123456' })
      .expect(400);

    expect(errorCodeOf(response)).toBe('TWO_FACTOR_NOT_SETUP');
  });
});
