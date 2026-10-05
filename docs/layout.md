# Layout

One feature folder per flow, scaffolded with `domain-driver`, grouped into areas (`auth`, `profile`). Infrastructure
that several flows share lives outside the feature folders.

```
zitd-api/
├── src/
│   ├── main.ts                      bootstrap: shared HTTP setup, shutdown hooks, Swagger, listen
│   ├── app.module.ts                wires config, database, security, mail, throttling, health, auth
│   ├── auth/
│   │   ├── auth.module.ts           groups the flow modules below
│   │   ├── shared/
│   │   │   ├── types/               User, UserCredentials, AuthResult, TwoFactorRecoveryCodes, User.mapper
│   │   │   └── services/            issueSession (session row + token pair), used by login flows
│   │   └── <flow>/                  one folder per flow, all with the same shape:
│   │       ├── <flow>.module.ts     registers the controller, service and optional flow repository
│   │       ├── controllers/         <Flow>.controller.ts   HTTP in, service call, HTTP out
│   │       ├── services/            <Flow>.service.ts      business rules; may inject shared repositories directly
│   │       ├── repositories/        <Flow>.repository.ts   flow SQL, mapping and transactions when needed
│   │       ├── schemas/             <Flow>.schema.ts       Zod request schema
│   │       ├── dto/                 <Flow>.dto.ts          nestjs-zod DTO built from the schema
│   │       └── types/               flow-specific result types (empty when the flow returns shared types)
│   ├── profile/
│   │   ├── profile.module.ts        groups the flow modules below
│   │   ├── shared/
│   │   │   ├── types/               Profile, ProfileChanges, Profile.mapper
│   │   │   └── repositories/        Profile.repository.ts, the `profiles` table; auth imports it to build a `User`
│   │   └── <flow>/                  same shape as an auth flow
│   ├── security/                    argon2 hasher, JWT + opaque tokens, TOTP, AES-GCM cipher,
│   │                                recovery codes, two-factor verifier, access-token guard, decorators
│   ├── database/                    Drizzle module, schema/, migration runner, pg error helper
│   ├── mail/                        mailer, templates/, transports/, shared/ outbox writes, deliver-email/ worker
│   ├── config/                      Zod env schema, ENV token, config module, shared HTTP setup, API docs
│   ├── common/                      envelope, response interceptor, exception filter, errors, throttle, validators
│   ├── health/                      GET /health (liveness), readiness/ for GET /health/readiness
├── tests/
│   ├── unit/                        mirrors src/; one spec per unit, no database, no network
│   ├── feature/<area>/<flow>.e2e-spec.ts   one end-to-end file per flow (auth/, profile/, health/, database/)
│   ├── setup/                       useTestApp, journey helpers, fixtures, global setup
│   └── jest-e2e.json
├── bruno/                           Bruno collection: one request file per route, ROUTES.md
│   └── <area>/protected/            bearer routes; the folder carries the auth, the requests inherit it
├── drizzle/                         generated SQL migrations
├── docs/                            layout.md, runtime.md and the design spec under superpowers/specs/
├── AGENTS.md                        the only agent guide (CLAUDE.md points here)
├── drizzle.config.ts
├── jest.coverage.config.js          unit + e2e coverage in one run
└── .env.example
```

## Flows

| Folder under `src/auth/`    | Route                                  | Returns                  |
| --------------------------- | -------------------------------------- | ------------------------ |
| `register`                  | `POST /auth/register`                  | `User`                   |
| `verify-email`              | `POST /auth/verify-email`              | 200, null data           |
| `resend-verification`       | `POST /auth/resend-verification`       | 200, null data           |
| `login`                     | `POST /auth/login`                     | `LoginResult`            |
| `verify-two-factor`         | `POST /auth/verify-two-factor`         | `AuthenticatedResult`    |
| `refresh-token`             | `POST /auth/refresh-token`             | `TokenPair`              |
| `logout`                    | `POST /auth/logout`                    | 200, null data           |
| `forgot-password`           | `POST /auth/forgot-password`           | 200, null data           |
| `reset-password`            | `POST /auth/reset-password`            | 200, null data           |
| `change-password`           | `POST /auth/change-password`           | 200, null data           |
| `me`                        | `GET /auth/me`                         | `User`                   |
| `setup-totp`                | `POST /auth/setup-totp`                | `TwoFactorSetup`         |
| `enable-totp`               | `POST /auth/enable-totp`               | `TwoFactorRecoveryCodes` |
| `disable-totp`              | `POST /auth/disable-totp`              | 200, null data           |
| `regenerate-recovery-codes` | `POST /auth/regenerate-recovery-codes` | `TwoFactorRecoveryCodes` |
| `list-sessions`             | `GET /auth/list-sessions`              | `Session[]`              |
| `revoke-session`            | `POST /auth/revoke-session`            | 200, null data           |
| `revoke-other-sessions`     | `POST /auth/revoke-other-sessions`     | 200, null data           |

| Folder under `src/profile/` | Route            | Returns   |
| --------------------------- | ---------------- | --------- |
| `update-profile`            | `PATCH /profile` | `Profile` |

`profile` is its own area rather than an auth flow: it holds what a client renders, not what authenticates a caller. Its
controller is `@Controller('profile')`, and because the area has a single resource the route carries no flow slug.

Request bodies and error codes are documented per route in [`bruno/ROUTES.md`](../bruno/ROUTES.md).
