# Routes

Base URL in development: `http://localhost:3000`. Every response uses one envelope:

```json
{ "success": true,  "data": { }, "error": null }
{ "success": false, "data": null, "error": { "code": "INVALID_CREDENTIALS", "message": "…" } }
```

All three keys are always present, so a client never probes for a missing one. `success` discriminates the two shapes.

`code` and the HTTP status answer different questions and neither replaces the other. The status is the transport signal
that proxies, caches and HTTP clients understand; `code` is the application discriminator a client branches on, because
statuses collide. Five codes share `401` alone — `TOKEN_EXPIRED` means refresh and retry, while `SESSION_REVOKED` means
log out — and no status can tell those apart. Never branch on `message`: it is for humans and is free to change.

`details` is only ever set on `VALIDATION_ERROR`, where it lists every failing field as `{ path, message }`. A `400`
that never reached a schema — a malformed JSON body, a failed parse pipe — is `BAD_REQUEST` and carries no `details`.

Protected routes take `Authorization: Bearer <accessToken>`. How long an access token lasts is set by
`JWT_ACCESS_TTL_MINUTES`, which also takes `never` for a token with no `exp` claim. Either way the token is checked
against its session on every request, so logout, password reset and session revocation apply immediately, and a `never`
token still stops working when its session is revoked or expires. Refresh tokens last 30 days and rotate on every use.

Each route below has a matching request file in this folder: `<area>/<flow>.yml` for a public route, and
`<area>/protected/<flow>.yml` for one that needs a bearer token. The `Protected` folder is where the bearer scheme is
defined, so no request repeats it.

## Health

| Method | Path      | Body | Response             |
| ------ | --------- | ---- | -------------------- |
| GET    | `/health` | –    | `{ "status": "ok" }` |

## Account

| Method | Path                        | Auth   | Body                                                             | Response                             | Errors                                                                 |
| ------ | --------------------------- | ------ | ---------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| POST   | `/auth/register`            | –      | `{ email, password, firstName, lastName }` (password ≥ 15 chars) | 201 `User`; sends verification email | `VALIDATION_ERROR`, `PASSWORD_COMPROMISED`, `EMAIL_ALREADY_REGISTERED` |
| POST   | `/auth/verify-email`        | –      | `{ token }` from the email link                                  | 204                                  | `INVALID_TOKEN`                                                        |
| POST   | `/auth/resend-verification` | –      | `{ email }`                                                      | 204 always                           | –                                                                      |
| GET    | `/auth/me`                  | bearer | –                                                                | 200 `User` (carries `profile`)       | `INVALID_TOKEN`, `SESSION_REVOKED`                                     |
| POST   | `/auth/change-password`     | bearer | `{ currentPassword, newPassword }`                               | 204; other sessions revoked          | `INVALID_CREDENTIALS`                                                  |

## Profile

| Method | Path       | Auth   | Body                                    | Response      | Errors                          |
| ------ | ---------- | ------ | --------------------------------------- | ------------- | ------------------------------- |
| PATCH  | `/profile` | bearer | `{ firstName?, lastName?, avatarUrl? }` | 200 `Profile` | `VALIDATION_ERROR`, `NOT_FOUND` |

Every field is optional and at least one must be present, so an empty body is a `VALIDATION_ERROR` rather than an update
that changes nothing. An absent key leaves the column alone; `"avatarUrl": null` clears it. `avatarUrl` must be an
absolute `http` or `https` URL — clients render it into an `<img src>`, so other schemes are refused at the boundary
rather than stored.

A profile is created with its account, in the same transaction as the user row, and is deleted with it. `NOT_FOUND`
therefore only appears when the row was removed by hand.

## Login and tokens

| Method | Path                      | Auth | Body                       | Response                            |
| ------ | ------------------------- | ---- | -------------------------- | ----------------------------------- |
| POST   | `/auth/login`             | –    | `{ email, password }`      | 200 authenticated or challenged     |
| POST   | `/auth/verify-two-factor` | –    | `{ challengeToken, code }` | 200 authenticated                   |
| POST   | `/auth/refresh-token`     | –    | `{ refreshToken }`         | 200 `{ accessToken, refreshToken }` |
| POST   | `/auth/logout`            | –    | `{ refreshToken }`         | 204 always                          |

`/auth/login` answers in one of two shapes, and `/auth/verify-two-factor` turns the second into the first:

```jsonc
{ "status": "authenticated", "accessToken": "…", "refreshToken": "…", "user": { } }
{ "status": "two_factor_required", "challengeToken": "…" }
```

`code` is a 6-digit authenticator code or an unused recovery code. Errors: `INVALID_CREDENTIALS`, `EMAIL_NOT_VERIFIED`
on login; `INVALID_TOKEN`, `TOKEN_EXPIRED`, `INVALID_TWO_FACTOR_CODE`, `TWO_FACTOR_NOT_ENABLED` on the second step;
`INVALID_TOKEN` or `SESSION_REVOKED` (on reuse of a rotated token) on refresh.

## Password recovery

| Method | Path                    | Auth | Body                  | Response                      | Errors          |
| ------ | ----------------------- | ---- | --------------------- | ----------------------------- | --------------- |
| POST   | `/auth/forgot-password` | –    | `{ email }`           | 204 always; sends reset email | –               |
| POST   | `/auth/reset-password`  | –    | `{ token, password }` | 204; every session revoked    | `INVALID_TOKEN` |

## Two-factor (all bearer)

| Method | Path                              | Body                 | Response                                       | Errors                                                                     |
| ------ | --------------------------------- | -------------------- | ---------------------------------------------- | -------------------------------------------------------------------------- |
| POST   | `/auth/setup-totp`                | –                    | 200 `{ secret, otpauthUrl, qrCodeDataUrl }`    | `TWO_FACTOR_ALREADY_ENABLED`                                               |
| POST   | `/auth/enable-totp`               | `{ code }`           | 200 `{ recoveryCodes: string[10] }` shown once | `TWO_FACTOR_NOT_SETUP`, `INVALID_TWO_FACTOR_CODE`                          |
| POST   | `/auth/disable-totp`              | `{ password, code }` | 204                                            | `TWO_FACTOR_NOT_ENABLED`, `INVALID_CREDENTIALS`, `INVALID_TWO_FACTOR_CODE` |
| POST   | `/auth/regenerate-recovery-codes` | `{ password, code }` | 200 `{ recoveryCodes }`                        | same as disable                                                            |

## Sessions (all bearer)

| Method | Path                          | Body            | Response                                           | Errors                             |
| ------ | ----------------------------- | --------------- | -------------------------------------------------- | ---------------------------------- |
| GET    | `/auth/list-sessions`         | –               | 200 `Session[]` (`current: true` marks the caller) | –                                  |
| POST   | `/auth/revoke-session`        | `{ sessionId }` | 204                                                | `NOT_FOUND` (not yours or unknown) |
| POST   | `/auth/revoke-other-sessions` | –               | 204                                                | –                                  |

## Shapes

```ts
User            { id, email, emailVerified, twoFactorEnabled, profile, createdAt, updatedAt }
Profile         { firstName, lastName, avatarUrl }
Session         { id, ip, userAgent, current, createdAt, lastUsedAt, expiresAt }
TwoFactorSetup  { secret, otpauthUrl, qrCodeDataUrl }
```

## Error codes

`VALIDATION_ERROR` 400 · `PASSWORD_COMPROMISED` 400 · `INVALID_CREDENTIALS` 401 · `INVALID_TOKEN` 401 · `TOKEN_EXPIRED`
401 · `SESSION_REVOKED` 401 · `INVALID_TWO_FACTOR_CODE` 401 · `EMAIL_NOT_VERIFIED` 403 · `NOT_FOUND` 404 ·
`EMAIL_ALREADY_REGISTERED` 409 · `TWO_FACTOR_ALREADY_ENABLED` 409 · `TWO_FACTOR_NOT_SETUP` 400 ·
`TWO_FACTOR_NOT_ENABLED` 400 · `RATE_LIMITED` 429 · `INTERNAL_ERROR` 500
