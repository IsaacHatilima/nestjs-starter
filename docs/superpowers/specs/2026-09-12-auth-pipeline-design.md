# ZITD API — Authentication Pipeline Design

Date: 2026-09-12 Status: implemented under stated assumptions (autonomous session, no approval gate available)

## Goal

A NestJS API (`zitd-api`) whose feature folders are scaffolded with `domain-driver` (one controller / service /
repository / schema / DTO per action) and which covers every authentication flow the ZITD dashboard needs, including
optional TOTP two-factor authentication.

## Assumptions made without user input

| Decision           | Choice                                                                                                        | Why                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Nest major         | 11 (not 12)                                                                                                   | `nestjs-zod` 5 declares peers `@nestjs/common ^10 \|\| ^11`; Nest 12 shipped days ago on TypeScript 6 |
| Package manager    | pnpm                                                                                                          | Matches `zitd-dashboard`                                                                              |
| Database           | PostgreSQL 17 + Drizzle ORM                                                                                   | Postgres already running locally (DBngin); Drizzle skill installed in this workspace                  |
| Validation         | Zod 4 + `nestjs-zod`                                                                                          | What `domain-driver` generates for Nest DTOs                                                          |
| Password policy    | 15-char minimum, no composition rules, blocklist (common list + Have I Been Pwned)                            | Current OWASP recommendation                                                                          |
| Access token       | JWT HS256, 15 min, claims `sub`, `sid`, `typ`                                                                 | Stateless auth, but revocable because the guard checks the session row                                |
| Refresh token      | Opaque 32-byte random, sha256 stored, rotated on use, reuse detection revokes the session                     | Standard rotation with theft detection                                                                |
| 2FA                | TOTP (otplib 13), secret encrypted at rest (AES-256-GCM), 10 single-use recovery codes, timestep replay guard | Authenticator-app compatible, safe at rest                                                            |
| Email verification | Required before login (`REQUIRE_EMAIL_VERIFICATION=true` by default)                                          | Safer default; toggleable                                                                             |
| Mail               | nodemailer SMTP in production; `log` driver in development; `memory` driver in tests                          | Tests can read tokens; dev needs no SMTP                                                              |
| Response shape     | `{ success, data, error }` on every response; `data` or `error` is null                                       | Workspace rule: consistent envelope                                                                   |
| Rate limiting      | `@nestjs/throttler` global, tighter limits on credential endpoints                                            | Workspace rule: rate limit every endpoint                                                             |

## Feature folders (domain-driver)

Every flow is its own feature under `src/auth/<flow>/` with the standard layers (`controllers/`, `services/`,
`repositories/`, `schemas/`, `dto/`, `types/`) and a `<flow>.module.ts`; `src/auth/auth.module.ts` groups the eighteen
flow modules. Types used by more than one flow (`User`, `UserCredentials`, the login result types,
`TwoFactorRecoveryCodes`) and session issuance live in `src/auth/shared/`.

```
src/auth/{register, login, verify-two-factor, refresh-token, logout, verify-email,
          resend-verification, forgot-password, reset-password, change-password, me,
          setup-totp, enable-totp, disable-totp, regenerate-recovery-codes,
          list-sessions, revoke-session, revoke-other-sessions}/
src/{config, database, security, mail, common}/   hand-written infrastructure
```

Each flow was scaffolded with `domain-driver make:feature <flow>` and
`make:action <flow>/<ReturnType> <flowAction> [--with-input] [--returns ...]`, then moved under `src/auth/`. The tool
emits `@Controller('<flow>')`; every flow uses `@Controller('auth')` so routes share the `/auth/` prefix. Two
GET-scaffolded actions that mutate state (`setupTotp`, `revokeOtherSessions`) are switched to `@Post()`.

## Endpoints

Base path: none. Every route below is `@Controller('<feature>')` + `@Post('<slug>')` or `@Get('<slug>')`.

### auth

| Method | Path                        | Auth                     | Body                               | Result                                                                                                                    |
| ------ | --------------------------- | ------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/register`            | public                   | `{ email, password }`              | 201 `User`; sends verification mail                                                                                       |
| POST   | `/auth/login`               | public                   | `{ email, password }`              | 200 `{ status: 'authenticated', accessToken, refreshToken, user }` or `{ status: 'two_factor_required', challengeToken }` |
| POST   | `/auth/verify-two-factor`   | public (challenge token) | `{ challengeToken, code }`         | 200 authenticated result; `code` is a TOTP or a recovery code                                                             |
| POST   | `/auth/refresh-token`       | public (refresh token)   | `{ refreshToken }`                 | 200 `{ accessToken, refreshToken }`                                                                                       |
| POST   | `/auth/logout`              | public (refresh token)   | `{ refreshToken }`                 | 204                                                                                                                       |
| POST   | `/auth/verify-email`        | public                   | `{ token }`                        | 204                                                                                                                       |
| POST   | `/auth/resend-verification` | public                   | `{ email }`                        | 204 always (no enumeration)                                                                                               |
| POST   | `/auth/forgot-password`     | public                   | `{ email }`                        | 204 always (no enumeration)                                                                                               |
| POST   | `/auth/reset-password`      | public                   | `{ token, password }`              | 204; revokes every session                                                                                                |
| POST   | `/auth/change-password`     | bearer                   | `{ currentPassword, newPassword }` | 204; revokes other sessions                                                                                               |
| GET    | `/auth/me`                  | bearer                   | –                                  | 200 `User`                                                                                                                |

### two-factor flows (all bearer)

| Method | Path                              | Body                 | Result                                                              |
| ------ | --------------------------------- | -------------------- | ------------------------------------------------------------------- |
| POST   | `/auth/setup-totp`                | –                    | 200 `{ secret, otpauthUrl, qrCodeDataUrl }` (pending until enabled) |
| POST   | `/auth/enable-totp`               | `{ code }`           | 200 `{ recoveryCodes: string[] }` (shown once)                      |
| POST   | `/auth/disable-totp`              | `{ password, code }` | 204                                                                 |
| POST   | `/auth/regenerate-recovery-codes` | `{ password, code }` | 200 `{ recoveryCodes }`                                             |

### session flows (all bearer)

| Method | Path                          | Body            | Result                                             |
| ------ | ----------------------------- | --------------- | -------------------------------------------------- |
| GET    | `/auth/list-sessions`         | –               | 200 `Session[]` (`current: true` marks the caller) |
| POST   | `/auth/revoke-session`        | `{ sessionId }` | 204 (own sessions only)                            |
| POST   | `/auth/revoke-other-sessions` | –               | 204                                                |

### Error codes

`VALIDATION_ERROR` 400 · `INVALID_CREDENTIALS` 401 · `INVALID_TOKEN` 401 · `TOKEN_EXPIRED` 401 · `SESSION_REVOKED` 401 ·
`EMAIL_NOT_VERIFIED` 403 · `TWO_FACTOR_NOT_ENABLED` 400 · `TWO_FACTOR_ALREADY_ENABLED` 409 · `TWO_FACTOR_NOT_SETUP` 400
· `INVALID_TWO_FACTOR_CODE` 401 · `EMAIL_ALREADY_REGISTERED` 409 · `NOT_FOUND` 404 · `RATE_LIMITED` 429 ·
`INTERNAL_ERROR` 500

## Data model (Drizzle / PostgreSQL)

- `users`: id uuid, email (lower-cased, unique), password_hash, email_verified_at, two_factor_enabled, two_factor_secret
  (encrypted, active), two_factor_pending_secret (encrypted, awaiting enable), two_factor_last_used_step, created_at,
  updated_at
- `sessions`: id uuid, user_id, refresh_token_hash (unique), previous_refresh_token_hash, expires_at, revoked_at,
  last_used_at, ip, user_agent, created_at
- `verification_tokens`: id uuid, user_id, purpose (`email_verification` | `password_reset`), token_hash (unique),
  expires_at, consumed_at, created_at
- `two_factor_recovery_codes`: id uuid, user_id, code_hash, used_at, created_at

## Token lifecycle

1. **Login** verifies argon2 hash, checks email verification. If 2FA is enabled it signs a 5-minute JWT with
   `typ: 'two_factor'` and returns `two_factor_required`. Otherwise it inserts a session row and returns an access JWT
   (`typ: 'access'`, `sid`) plus the opaque refresh token.
2. **Verify two-factor** validates the challenge JWT, then either a TOTP code (rejecting a timestep at or before the
   last used one) or an unused recovery code (marked used), then issues a session like login.
3. **Refresh** hashes the presented token. Match on `refresh_token_hash` → rotate (old hash moves to
   `previous_refresh_token_hash`), bump `last_used_at`, issue a new pair. Match on `previous_refresh_token_hash` → token
   reuse → revoke the session and reject. No match → reject.
4. **Access guard** verifies the JWT and loads the session by `sid`; revoked or expired sessions are rejected, so
   logout, password reset, and session revocation take effect immediately.

## Guardrails added after review

- `recordTotpStep` is a conditional update (`last_used_step < step`), so two concurrent requests with the same code
  cannot both succeed.
- Recovery-code regeneration and password change each run inside one transaction.
- Production refuses `MAIL_DRIVER=log|memory`; Swagger is off in production unless `API_DOCS_ENABLED=true`.
- `TRUST_PROXY` and `DATABASE_SSL` exist for deployments behind a proxy or on TLS-only Postgres.
- Refresh and logout share the credential throttle with login.

## Password policy

Follows NIST SP 800-63B-4 section 3.1.1 (https://pages.nist.gov/800-63-4/sp800-63b.html):

- 15 characters minimum, the figure that section sets for a password used as a single factor, and 128 maximum, above the
  64 it asks verifiers to permit.
- No composition rules, which that section forbids outright, and no periodic rotation.
- A blocklist check wherever a password is set (register, reset, change), refusing commonly used passwords, passwords
  built from the service name or the subscriber's own address, and passwords in the breach corpus. The reason is
  returned to the caller as `PASSWORD_COMPROMISED`, because that section requires giving one.
- The local list is the UK NCSC top 100,000, derived from Have I Been Pwned and mirrored in SecLists. It is versioned in
  `src/security/blocklist/` with its SHA-256, install date and every superseded version, and is replaced only by
  `pnpm blocklist:update`, which reverts on any failure.
- Breach lookups use the Have I Been Pwned range API with k-anonymity: only the first five characters of the SHA-1 hash
  leave the server. `PASSWORD_BREACH_CHECK=false` turns it off, and a failed lookup fails open so a third-party outage
  cannot block every signup. The bundled common-password list never needs the network.

## Accepted risks and follow-ups

- **Registration reveals existing emails** (409 `EMAIL_ALREADY_REGISTERED`). Kept for dashboard UX; the other flows
  (login, forgot password, resend verification) do not enumerate. Revisit if abuse appears.
- **`pnpm test:cov` fails one test in roughly ten; `pnpm test:e2e` does not.** The coverage run boots all 21 end-to-end
  suites in one serialised run, and the failure lands on a different test each time, always the first HTTP call of a
  suite, with a route that exists answering 404. Three real defects were found and fixed while chasing it: a project's
  `testTimeout` is ignored under `projects` so the suites silently fell back to Jest's 5-second default, a unit spec
  replaced `globalThis.fetch` and never restored it, and enrolment in the two-factor helper spent the step its own
  verification code needed. Together those took it from three failures in seven runs to one in ten. The remainder is
  unexplained. Next step is to log the router stack and the app instance at the moment a 404 is returned, to establish
  whether the request reaches a different app than the suite created.
- **No per-account lockout or security-event log** beyond IP-based throttling. Follow-up: failed-attempt counters and
  structured events for failed logins, failed second factors and refresh-token reuse.

## Testing

- Unit tests (`*.spec.ts` beside each service and security helper) with mocked repositories.
- End-to-end tests (`test/*.e2e-spec.ts`, supertest) against `zitd_api_test` on the local Postgres; migrations run in a
  Jest global setup, tables truncated between suites, mail captured by the memory driver.
- Coverage target 80 %.

## Out of scope

OAuth / social login, WebAuthn passkeys, SMS second factor, admin user management, multi-tenancy.
