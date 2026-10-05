import { registerAndLogin, useTestApp } from '@tests/setup/test-app';

const ctx = useTestApp();

describe('POST /auth/forgot-password (e2e)', () => {
  it('emails a reset link to a known address', async () => {
    const { t } = ctx;
    await registerAndLogin(t, 'ada@example.com');
    t.mail.clear();

    await t.http().post('/auth/forgot-password').send({ email: 'ada@example.com' }).expect(200);

    expect(t.mail.sent).toHaveLength(1);
    expect(t.mail.last()?.subject).toMatch(/reset/i);
    expect(t.mail.last()?.text).toContain('http://localhost:3001/reset-password?token=');
  });

  it('answers 200 for unknown addresses without sending anything', async () => {
    const { t } = ctx;

    await t.http().post('/auth/forgot-password').send({ email: 'ghost@example.com' }).expect(200);

    expect(t.mail.sent).toHaveLength(0);
  });
});
