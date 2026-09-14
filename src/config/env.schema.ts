import { z } from 'zod';

const positiveInt = () => z.coerce.number().int().positive();

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: positiveInt().default(3000),
    APP_NAME: z.string().min(1).default('ZITD'),
    APP_URL: z.url().default('http://localhost:3001'),
    CORS_ORIGIN: z.string().min(1).default('http://localhost:3001'),
    DATABASE_URL: z.string().min(1),
    DATABASE_SSL: z.stringbool().default(false),
    /** Connections per pool. Tests keep many apps alive at once, so they need a far smaller pool than production. */
    DATABASE_POOL_MAX: positiveInt().default(10),
    JWT_SECRET: z.string().min(32),
    /**
     * Minutes until an access token expires, or `never` for a token carrying no `exp` claim at all, the way Laravel
     * Sanctum's `expiration => null` works. `never` is not unbounded: AccessTokenGuard looks the session up on every
     * request, so the token still dies on logout, on revocation, and when the session row itself expires after
     * REFRESH_TOKEN_TTL_DAYS. The default is a short lifetime, so a deployment has to opt into the long one.
     */
    JWT_ACCESS_TTL_MINUTES: z.union([z.literal('never').transform(() => null), positiveInt()]).default(15),
    REFRESH_TOKEN_TTL_DAYS: positiveInt().default(30),
    TWO_FACTOR_CHALLENGE_TTL_SECONDS: positiveInt().default(300),
    EMAIL_VERIFICATION_TTL_HOURS: positiveInt().default(24),
    PASSWORD_RESET_TTL_MINUTES: positiveInt().default(60),
    REQUIRE_EMAIL_VERIFICATION: z.stringbool().default(true),
    TWO_FACTOR_ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, 'must be 32 bytes encoded as 64 hex characters'),
    TWO_FACTOR_ISSUER: z.string().min(1).default('ZITD'),
    MAIL_DRIVER: z.enum(['log', 'smtp', 'memory']).default('log'),
    MAIL_FROM: z.string().min(1).default('ZITD <no-reply@zitd.local>'),
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: positiveInt().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_SECURE: z.stringbool().default(false),
    /**
     * Check new passwords against Have I Been Pwned. Only a 5-character hash prefix is ever sent; see
     * PwnedPasswordsClient for the k-anonymity protocol.
     */
    PASSWORD_BREACH_CHECK: z.stringbool().default(true),
    PASSWORD_BREACH_TIMEOUT_MS: positiveInt().default(2000),
    THROTTLE_TTL_MS: positiveInt().default(60_000),
    THROTTLE_LIMIT: positiveInt().default(60),
    /** Set when running behind a reverse proxy so client IPs are read from X-Forwarded-For. */
    TRUST_PROXY: z.stringbool().default(false),
    /** Defaults to enabled outside production; see isApiDocsEnabled. */
    API_DOCS_ENABLED: z.stringbool().optional(),
  })
  // Cross-field rules that a plain object schema cannot express.
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.MAIL_DRIVER !== 'smtp') {
      ctx.addIssue({
        code: 'custom',
        path: ['MAIL_DRIVER'],
        message: 'MAIL_DRIVER must be smtp in production; log and memory print tokens',
      });
    }
    if (env.MAIL_DRIVER === 'smtp' && !env.SMTP_HOST) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_HOST'],
        message: 'SMTP_HOST is required when MAIL_DRIVER=smtp',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

// `KEY=` in a .env file means "unset", not "empty string", so defaults still apply.
function withoutEmptyStrings(raw: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, value === '' ? undefined : value]));
}

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(withoutEmptyStrings(raw));
  if (result.success) return result.data;

  const lines = result.error.issues.map((issue) => `  ${issue.path.map(String).join('.')}: ${issue.message}`);
  throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
}
