const UNIQUE_VIOLATION = '23505';

interface PgLikeError {
  code?: unknown;
  cause?: unknown;
}

function pgCodeOf(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const { code, cause } = error as PgLikeError;
  return typeof code === 'string' ? code : pgCodeOf(cause);
}

/** True when the driver (possibly wrapped by Drizzle) reported a unique constraint violation. */
export function isUniqueViolation(error: unknown): boolean {
  return pgCodeOf(error) === UNIQUE_VIOLATION;
}
