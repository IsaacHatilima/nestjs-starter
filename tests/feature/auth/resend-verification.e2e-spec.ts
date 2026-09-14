import { errorCodeOf, lastMailToken, registration, useTestApp } from '@tests/setup/test-app';

const ctx = useTestApp();

describe('POST /auth/resend-verification (e2e)', () => {
  it('replaces the pending token with a fresh emailed link', async () => {
    const { t } = ctx;
    await t.http().post('/auth/register').send(registration()).expect(201);
    const first = lastMailToken(t.mail);

    await t.http().post('/auth/resend-verification').send({ email: 'ada@example.com' }).expect(204);
    const second = lastMailToken(t.mail);

    expect(second).not.toBe(first);
    const stale = await t.http().post('/auth/verify-email').send({ token: first }).expect(401);
    expect(errorCodeOf(stale)).toBe('INVALID_TOKEN');
    await t.http().post('/auth/verify-email').send({ token: second }).expect(204);
  });

  it('answers 204 for unknown emails without sending anything', async () => {
    const { t } = ctx;

    await t.http().post('/auth/resend-verification').send({ email: 'nobody@example.com' }).expect(204);

    expect(t.mail.sent).toHaveLength(0);
  });
});
