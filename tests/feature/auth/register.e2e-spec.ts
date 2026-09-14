import { dataOf, errorCodeOf, errorOf, FIRST_NAME, LAST_NAME, PASSWORD, useTestApp } from '@tests/setup/test-app';

const ctx = useTestApp();

describe('POST /auth/register (e2e)', () => {
  it('creates an unverified account and emails a verification link', async () => {
    const { t } = ctx;

    const response = await t
      .http()
      .post('/auth/register')
      .send({ email: 'Ada@Example.com', password: PASSWORD, firstName: FIRST_NAME, lastName: LAST_NAME })
      .expect(201);

    expect(dataOf(response)).toMatchObject({
      email: 'ada@example.com',
      emailVerified: false,
      twoFactorEnabled: false,
      profile: { firstName: 'Ada', lastName: 'Lovelace', avatarUrl: null },
    });
    expect(dataOf(response)).not.toHaveProperty('passwordHash');
    expect(t.mail.sent).toHaveLength(1);
    expect(t.mail.last()?.to).toBe('ada@example.com');
    expect(t.mail.last()?.text).toContain('http://localhost:3001/verify-email?token=');
  });

  it('rejects invalid bodies with field-level details', async () => {
    const response = await ctx.t
      .http()
      .post('/auth/register')
      .send({ email: 'not-an-email', password: 'short', firstName: '', lastName: '  ' })
      .expect(400);

    expect(errorCodeOf(response)).toBe('VALIDATION_ERROR');
    expect(
      errorOf(response)
        .details.map((issue) => issue.path)
        .sort(),
    ).toEqual(['email', 'firstName', 'lastName', 'password']);
  });

  it('rejects a body with no name at all', async () => {
    const response = await ctx.t
      .http()
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: PASSWORD })
      .expect(400);

    expect(errorCodeOf(response)).toBe('VALIDATION_ERROR');
    expect(
      errorOf(response)
        .details.map((issue) => issue.path)
        .sort(),
    ).toEqual(['firstName', 'lastName']);
  });

  it('rejects a duplicate email regardless of case', async () => {
    const { t } = ctx;
    await t
      .http()
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: PASSWORD, firstName: FIRST_NAME, lastName: LAST_NAME })
      .expect(201);

    const response = await t
      .http()
      .post('/auth/register')
      .send({ email: 'ADA@example.com', password: PASSWORD, firstName: FIRST_NAME, lastName: LAST_NAME })
      .expect(409);

    expect(errorCodeOf(response)).toBe('EMAIL_ALREADY_REGISTERED');
  });
});
