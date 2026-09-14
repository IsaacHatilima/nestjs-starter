import {
  bearer,
  errorCodeOf,
  errorOf,
  login,
  PASSWORD,
  registerAndLogin,
  registration,
  useTestApp,
} from '@tests/setup/test-app';

const ctx = useTestApp();

// Long enough to clear the 15-character minimum, so the blocklist is what refuses them.
const COMMON = 'Password12345678';
const CONTEXTUAL = 'ZITDZITDZITDZITD';

describe('password policy (e2e)', () => {
  describe('length', () => {
    it('refuses a password under fifteen characters and says so', async () => {
      const response = await ctx.t
        .http()
        .post('/auth/register')
        .send(registration({ password: 'fourteen chars' }))
        .expect(400);

      expect(errorCodeOf(response)).toBe('VALIDATION_ERROR');
      expect(errorOf(response).details[0]).toEqual({
        path: 'password',
        message: 'Password must be at least 15 characters',
      });
    });

    it('accepts exactly fifteen characters', async () => {
      await ctx.t
        .http()
        .post('/auth/register')
        .send(registration({ password: 'ferrous gadwall' }))
        .expect(201);
    });
  });

  describe('blocklist on registration', () => {
    it('refuses a commonly used password, even dressed up with digits', async () => {
      const response = await ctx.t
        .http()
        .post('/auth/register')
        .send(registration({ password: COMMON }))
        .expect(400);

      expect(errorCodeOf(response)).toBe('PASSWORD_COMPROMISED');
      expect(errorOf(response).message).toMatch(/commonly used/i);
    });

    it('refuses a password built from the service name', async () => {
      const response = await ctx.t
        .http()
        .post('/auth/register')
        .send(registration({ password: CONTEXTUAL }))
        .expect(400);

      expect(errorCodeOf(response)).toBe('PASSWORD_COMPROMISED');
    });

    it('creates no account when the password is refused', async () => {
      await ctx.t
        .http()
        .post('/auth/register')
        .send(registration({ password: COMMON }))
        .expect(400);

      await ctx.t
        .http()
        .post('/auth/register')
        .send(registration({ password: PASSWORD }))
        .expect(201);
    });
  });

  describe('blocklist on change and reset', () => {
    it('refuses a commonly used password when changing it, and keeps the old one working', async () => {
      const { t } = ctx;
      const { accessToken } = await registerAndLogin(t, 'ada@example.com');

      const response = await t
        .http()
        .post('/auth/change-password')
        .set(bearer(accessToken))
        .send({ currentPassword: PASSWORD, newPassword: COMMON })
        .expect(400);

      expect(errorCodeOf(response)).toBe('PASSWORD_COMPROMISED');
      await login(t, 'ada@example.com', PASSWORD);
    });

    it('refuses a commonly used password when resetting it', async () => {
      const { t } = ctx;
      await registerAndLogin(t, 'ada@example.com');
      await t.http().post('/auth/forgot-password').send({ email: 'ada@example.com' }).expect(204);
      const token = t.mail.last()?.text.match(/token=([^\s]+)/)?.[1] ?? '';

      const response = await t
        .http()
        .post('/auth/reset-password')
        .send({ token: decodeURIComponent(token), password: COMMON })
        .expect(400);

      expect(errorCodeOf(response)).toBe('PASSWORD_COMPROMISED');
      await login(t, 'ada@example.com', PASSWORD);
    });
  });
});
