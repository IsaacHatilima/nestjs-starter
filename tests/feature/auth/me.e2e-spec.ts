import { bearer, dataOf, errorCodeOf, registerAndLogin, useTestApp } from '@tests/setup/test-app';

const ctx = useTestApp();

describe('GET /auth/me (e2e)', () => {
  it('returns the caller for a valid bearer token', async () => {
    const { t } = ctx;
    const { accessToken } = await registerAndLogin(t, 'ada@example.com');

    const response = await t.http().get('/auth/me').set(bearer(accessToken)).expect(200);

    expect(dataOf(response)).toMatchObject({
      email: 'ada@example.com',
      emailVerified: true,
      profile: { firstName: 'Ada', lastName: 'Lovelace', avatarUrl: null },
    });
  });

  it('rejects requests without a token or with a bad one', async () => {
    const { t } = ctx;

    const anonymous = await t.http().get('/auth/me').expect(401);
    const garbage = await t.http().get('/auth/me').set(bearer('garbage')).expect(401);

    expect(errorCodeOf(anonymous)).toBe('INVALID_TOKEN');
    expect(errorCodeOf(garbage)).toBe('INVALID_TOKEN');
  });
});
