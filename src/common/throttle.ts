const MINUTE_MS = 60_000;

/** Endpoints that check a password, code or token. */
export const CREDENTIAL_THROTTLE = { default: { limit: 10, ttl: MINUTE_MS } };

/** Endpoints that send email. */
export const EMAIL_THROTTLE = { default: { limit: 3, ttl: MINUTE_MS } };
