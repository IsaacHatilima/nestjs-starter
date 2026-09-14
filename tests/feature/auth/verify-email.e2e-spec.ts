import { dataOf, errorCodeOf, lastMailToken, registration, useTestApp } from '@tests/setup/test-app';

const ctx = useTestApp();
const account = registration();
const credentials = { email: account.email, password: account.password };

describe('POST /auth/verify-email (e2e)', () => {
  it('unlocks login once the emailed token is consumed', async () => {
    const { t } = ctx;
    await t.http().post('/auth/register').send(account).expect(201);
    const blocked = await t.http().post('/auth/login').send(credentials).expect(403);
    expect(errorCodeOf(blocked)).toBe('EMAIL_NOT_VERIFIED');

    await t
      .http()
      .post('/auth/verify-email')
      .send({ token: lastMailToken(t.mail) })
      .expect(204);

    const loggedIn = await t.http().post('/auth/login').send(credentials).expect(200);
    expect(dataOf<{ user: { emailVerified: boolean } }>(loggedIn).user.emailVerified).toBe(true);
  });

  it('accepts each token only once', async () => {
    const { t } = ctx;
    await t.http().post('/auth/register').send(account).expect(201);
    const token = lastMailToken(t.mail);
    await t.http().post('/auth/verify-email').send({ token }).expect(204);

    const reused = await t.http().post('/auth/verify-email').send({ token }).expect(401);

    expect(errorCodeOf(reused)).toBe('INVALID_TOKEN');
  });

  it('rejects an unknown token', async () => {
    const response = await ctx.t.http().post('/auth/verify-email').send({ token: 'nope' }).expect(401);

    expect(errorCodeOf(response)).toBe('INVALID_TOKEN');
  });
});
