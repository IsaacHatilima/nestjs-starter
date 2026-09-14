import { enroll } from '@tests/setup/two-factor';
import { bodyOf, dataOf, errorCodeOf, PASSWORD, registerAndLogin, useTestApp } from '@tests/setup/test-app';

const ctx = useTestApp();

describe('POST /auth/login (e2e)', () => {
  it('returns tokens and the public user for valid credentials', async () => {
    const { t } = ctx;
    await registerAndLogin(t, 'ada@example.com');

    const response = await t
      .http()
      .post('/auth/login')
      .send({ email: 'ada@example.com', password: PASSWORD })
      .expect(200);

    const data = dataOf<{
      status: string;
      accessToken: string;
      refreshToken: string;
      user: object;
    }>(response);
    expect(data.status).toBe('authenticated');
    expect(data.accessToken).toEqual(expect.any(String));
    expect(data.refreshToken).toEqual(expect.any(String));
    expect(data.user).toMatchObject({
      email: 'ada@example.com',
      emailVerified: true,
    });
    expect(data.user).not.toHaveProperty('passwordHash');
  });

  it('rejects a wrong password and an unknown email identically', async () => {
    const { t } = ctx;
    await registerAndLogin(t, 'ada@example.com');

    const wrong = await t.http().post('/auth/login').send({ email: 'ada@example.com', password: 'nope' }).expect(401);
    const unknown = await t
      .http()
      .post('/auth/login')
      .send({ email: 'ghost@example.com', password: 'nope' })
      .expect(401);

    expect(bodyOf(wrong)).toEqual(bodyOf(unknown));
    expect(errorCodeOf(wrong)).toBe('INVALID_CREDENTIALS');
  });

  it('answers with a two-factor challenge instead of tokens once TOTP is enabled', async () => {
    const { t } = ctx;
    const { accessToken } = await registerAndLogin(t, 'ada@example.com');
    await enroll(t, accessToken);

    const response = await t
      .http()
      .post('/auth/login')
      .send({ email: 'ada@example.com', password: PASSWORD })
      .expect(200);

    const data = dataOf<{ status: string; challengeToken: string }>(response);
    expect(data.status).toBe('two_factor_required');
    expect(data.challengeToken).toEqual(expect.any(String));
    expect(data).not.toHaveProperty('accessToken');
  });
});
