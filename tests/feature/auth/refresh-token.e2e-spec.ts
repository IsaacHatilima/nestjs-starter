import { bearer, dataOf, errorCodeOf, registerAndLogin, useTestApp } from '@tests/setup/test-app';

const ctx = useTestApp();

interface Pair {
  accessToken: string;
  refreshToken: string;
}

describe('POST /auth/refresh-token (e2e)', () => {
  it('rotates the refresh token and issues a working access token', async () => {
    const { t } = ctx;
    const first = await registerAndLogin(t, 'ada@example.com');

    const response = await t.http().post('/auth/refresh-token').send({ refreshToken: first.refreshToken }).expect(200);

    const second = dataOf<Pair>(response);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    await t.http().get('/auth/me').set(bearer(second.accessToken)).expect(200);
  });

  it('revokes the whole session when a rotated-out token is replayed', async () => {
    const { t } = ctx;
    const first = await registerAndLogin(t, 'ada@example.com');
    const second = dataOf<Pair>(
      await t.http().post('/auth/refresh-token').send({ refreshToken: first.refreshToken }).expect(200),
    );

    const replay = await t.http().post('/auth/refresh-token').send({ refreshToken: first.refreshToken }).expect(401);

    expect(errorCodeOf(replay)).toBe('SESSION_REVOKED');
    const afterTheft = await t.http().get('/auth/me').set(bearer(second.accessToken)).expect(401);
    expect(errorCodeOf(afterTheft)).toBe('SESSION_REVOKED');
    await t.http().post('/auth/refresh-token').send({ refreshToken: second.refreshToken }).expect(401);
  });

  it('rejects an unknown refresh token', async () => {
    const response = await ctx.t.http().post('/auth/refresh-token').send({ refreshToken: 'unknown' }).expect(401);

    expect(errorCodeOf(response)).toBe('INVALID_TOKEN');
  });
});
