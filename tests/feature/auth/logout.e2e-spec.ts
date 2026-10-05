import { bearer, errorCodeOf, registerAndLogin, useTestApp } from '@tests/setup/test-app';

const ctx = useTestApp();

describe('POST /auth/logout (e2e)', () => {
  it('revokes the session immediately', async () => {
    const { t } = ctx;
    const { accessToken, refreshToken } = await registerAndLogin(t, 'ada@example.com');

    await t.http().post('/auth/logout').send({ refreshToken }).expect(200);

    const me = await t.http().get('/auth/me').set(bearer(accessToken)).expect(401);
    expect(errorCodeOf(me)).toBe('SESSION_REVOKED');
    await t.http().post('/auth/refresh-token').send({ refreshToken }).expect(401);
  });

  it('is idempotent for tokens that are already revoked or unknown', async () => {
    const { t } = ctx;
    const { refreshToken } = await registerAndLogin(t, 'ada@example.com');
    await t.http().post('/auth/logout').send({ refreshToken }).expect(200);

    await t.http().post('/auth/logout').send({ refreshToken }).expect(200);
    await t.http().post('/auth/logout').send({ refreshToken: 'unknown' }).expect(200);
  });
});
