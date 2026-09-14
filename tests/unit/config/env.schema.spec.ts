import { validateEnv } from '@/config/env.schema';

const VALID = {
  DATABASE_URL: 'postgres://postgres@127.0.0.1:5432/zitd_api_test',
  JWT_SECRET: 'x'.repeat(32),
  TWO_FACTOR_ENCRYPTION_KEY: 'a'.repeat(64),
};

describe('validateEnv', () => {
  it('applies defaults for optional settings', () => {
    const env = validateEnv(VALID);

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.JWT_ACCESS_TTL_MINUTES).toBe(15);
    expect(env.REFRESH_TOKEN_TTL_DAYS).toBe(30);
    expect(env.REQUIRE_EMAIL_VERIFICATION).toBe(true);
    expect(env.MAIL_DRIVER).toBe('log');
    expect(env.THROTTLE_LIMIT).toBe(60);
  });

  it('coerces numeric and boolean strings', () => {
    const env = validateEnv({
      ...VALID,
      PORT: '4100',
      REQUIRE_EMAIL_VERIFICATION: 'false',
      SMTP_PORT: '2525',
    });

    expect(env.PORT).toBe(4100);
    expect(env.REQUIRE_EMAIL_VERIFICATION).toBe(false);
    expect(env.SMTP_PORT).toBe(2525);
  });

  it('reads the access token lifetime in minutes', () => {
    expect(validateEnv({ ...VALID, JWT_ACCESS_TTL_MINUTES: '60' }).JWT_ACCESS_TTL_MINUTES).toBe(60);
  });

  // Sanctum's `expiration => null`: the token carries no exp and lives as long as its session.
  it('reads `never` as no lifetime at all', () => {
    expect(validateEnv({ ...VALID, JWT_ACCESS_TTL_MINUTES: 'never' }).JWT_ACCESS_TTL_MINUTES).toBeNull();
  });

  it.each(['0', '-5', 'forever', '1.5'])('rejects %p as an access token lifetime', (value) => {
    expect(() => validateEnv({ ...VALID, JWT_ACCESS_TTL_MINUTES: value })).toThrow(/JWT_ACCESS_TTL_MINUTES/);
  });

  it('falls back to the default when the variable is present but empty', () => {
    expect(validateEnv({ ...VALID, JWT_ACCESS_TTL_MINUTES: '' }).JWT_ACCESS_TTL_MINUTES).toBe(15);
  });

  it('rejects a short JWT secret and names the variable', () => {
    expect(() => validateEnv({ ...VALID, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });

  it('rejects a two-factor key that is not 32 bytes of hex', () => {
    expect(() => validateEnv({ ...VALID, TWO_FACTOR_ENCRYPTION_KEY: 'zz' })).toThrow(/TWO_FACTOR_ENCRYPTION_KEY/);
  });

  it('requires SMTP_HOST when the smtp mail driver is selected', () => {
    expect(() => validateEnv({ ...VALID, MAIL_DRIVER: 'smtp' })).toThrow(/SMTP_HOST/);
  });

  it('refuses mail drivers that print tokens when running in production', () => {
    const production = {
      ...VALID,
      NODE_ENV: 'production',
      SMTP_HOST: 'smtp.example.com',
    };

    expect(() => validateEnv({ ...production, MAIL_DRIVER: 'log' })).toThrow(/MAIL_DRIVER/);
    expect(() => validateEnv({ ...production, MAIL_DRIVER: 'memory' })).toThrow(/MAIL_DRIVER/);
    expect(validateEnv({ ...production, MAIL_DRIVER: 'smtp' }).MAIL_DRIVER).toBe('smtp');
  });

  it('defaults the operational flags to the safe local values', () => {
    const env = validateEnv(VALID);

    expect(env.DATABASE_SSL).toBe(false);
    expect(env.PASSWORD_BREACH_CHECK).toBe(true);
    expect(env.PASSWORD_BREACH_TIMEOUT_MS).toBe(2000);
    expect(env.TRUST_PROXY).toBe(false);
    expect(env.API_DOCS_ENABLED).toBeUndefined();
    expect(validateEnv({ ...VALID, API_DOCS_ENABLED: 'false' }).API_DOCS_ENABLED).toBe(false);
  });

  it('drops variables it does not know about', () => {
    const env = validateEnv({ ...VALID, RANDOM_THING: '1' });

    expect((env as Record<string, unknown>).RANDOM_THING).toBeUndefined();
  });
});
