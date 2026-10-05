# nest-api

NestJS 11 API starter. Every flow is its own feature folder under an area (`src/auth/`, `src/profile/`), scaffolded with
[domain-driver](https://www.npmjs.com/package/domain-driver): one controller, service, schema and DTO per flow, plus a
module. Flow repositories own transactions and mapping; services inject shared repositories directly for simpler work.
The pipeline covers registration, email verification, login, optional TOTP two-factor authentication, token refresh,
password recovery and session management, plus a user profile carrying the name and an optional avatar URL.

## Stack

| Concern       | Choice                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------ |
| Framework     | NestJS 11 (Express), TypeScript strict                                                     |
| Validation    | Zod 4 through `nestjs-zod` (`ZodValidationPipe` as the global pipe)                        |
| Database      | PostgreSQL 17, Drizzle ORM, `drizzle-kit` migrations in `drizzle/`                         |
| Passwords     | argon2id                                                                                   |
| Tokens        | JWT access tokens (15 min) + opaque rotating refresh tokens (30 days)                      |
| Two-factor    | TOTP via `otplib` 13, secret encrypted at rest (AES-256-GCM), 10 single-use recovery codes |
| Mail          | PostgreSQL outbox, nodemailer SMTP in production, `log` in development, `memory` in tests  |
| Rate limiting | `@nestjs/throttler`, stricter on credential and email endpoints                            |
| Docs          | Swagger UI at `/docs`                                                                      |

## Getting started

```bash
pnpm install
cp .env.example .env          # then set JWT_SECRET and TWO_FACTOR_ENCRYPTION_KEY (openssl rand -hex 32)
createdb zitd_api             # or create it in your Postgres client
pnpm db:migrate
pnpm start:dev
```

The API listens on `PORT` (default 3000). In development, the outbox worker prints emails to the console with their
links, usually within one second, so you can verify accounts and reset passwords without an SMTP server.

## Environment

See [`.env.example`](.env.example) for every variable. The important ones:

- `DATABASE_URL`, `JWT_SECRET` (32+ chars), `TWO_FACTOR_ENCRYPTION_KEY` (64 hex chars) are required.
- `APP_URL` is the dashboard origin used in email links (`/verify-email?token=…`, `/reset-password?token=…`).
- `REQUIRE_EMAIL_VERIFICATION` (default `true`) blocks login until the address is verified.
- `MAIL_DRIVER` is `log`, `smtp` or `memory`; `smtp` needs `SMTP_HOST` and friends. Production refuses `log` and
  `memory` because they print tokens.
- `TRUST_PROXY=true` behind a load balancer so session IPs are real; `DATABASE_SSL=true` for TLS-only Postgres.
- Swagger at `/docs` is served outside production; `API_DOCS_ENABLED` overrides that either way.
- `MAIL_OUTBOX_POLL_MS`, `MAIL_OUTBOX_RETRY_MS` and `MAIL_OUTBOX_LEASE_MS` control delivery polling, retry backoff and
  renewable claims. Queued messages use `TWO_FACTOR_ENCRYPTION_KEY` for encryption at rest.

Configuration is validated with Zod at startup; a bad value fails fast with a message naming the variable.

## Documentation

- [`docs/layout.md`](docs/layout.md): folder structure and the flow-to-route table.
- [`bruno/ROUTES.md`](bruno/ROUTES.md): every route with bodies, responses and error codes.
- [`docs/runtime.md`](docs/runtime.md): health checks, shutdown, HTTP configuration and durable mail delivery.
- [`bruno/`](bruno/): Bruno collection (OpenCollection YAML), one request per route.
- [The design spec](docs/superpowers/specs/2026-09-12-auth-pipeline-design.md): decisions, token lifecycle, accepted
  risks.
- Swagger UI at `/docs` while the server runs outside production.

## Trying it in Bruno

Open the `bruno/` folder as a collection in Bruno 3 or newer and select the `Local` environment. Run the requests in
order: Register, copy the token printed in the server log into the `token` field of Verify email, run it, then Login.
Login and Verify two-factor store the access and refresh tokens for the bearer requests; Setup TOTP stores the secret so
you can enrol it in an authenticator app. The environment holds only `baseUrl` and the account `email` and `password`;
everything else a request sends — names, avatar URL, codes, pasted tokens — lives in that request's own body.

## Scaffolding

Each flow is one feature. To add a flow, scaffold it at the root, move it under its area, fill in the generated files,
and import its module in `src/<area>/<area>.module.ts`:

```bash
pnpm scaffold make:feature <flow>
pnpm scaffold make:action <flow>/<ReturnType> <flowAction> --with-input --returns one|list|void
mv src/<flow> src/<area>/<flow>
```

The tool emits `@Controller('<flow>')`; the flows here use `@Controller('<area>')` so every route lives under its area.
See `AGENTS.md` for the rules the generated code follows. Remove a generated repository when the service only needs
shared repository calls; keep it when the flow owns mapping, a query or a transaction.

## Scripts

| Script                           | What it does                                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `pnpm start:dev`                 | Watch mode                                                                                            |
| `pnpm build` / `pnpm start:prod` | Compile to `dist/` and run it                                                                         |
| `pnpm test`                      | Unit tests (no database needed)                                                                       |
| `pnpm test:e2e`                  | End-to-end tests, one file per flow under `tests/feature/`, against `zitd_api_test` (see `.env.test`) |
| `pnpm test:all`                  | Unit and e2e together                                                                                 |
| `pnpm test:cov`                  | Unit and e2e with a merged coverage report (80 % threshold)                                           |
| `pnpm typecheck`                 | `tsc --noEmit`                                                                                        |
| `pnpm lint`                      | ESLint with autofix                                                                                   |
| `pnpm blocklist:update`          | Fetch a new password blocklist, archiving the old one; reverts on failure                             |
| `pnpm blocklist:check`           | Verify the blocklist still matches its manifest                                                       |
| `pnpm db:generate`               | Write a migration from schema changes                                                                 |
| `pnpm db:migrate`                | Apply migrations (`NODE_ENV=test pnpm db:migrate` targets the test database)                          |
| `pnpm db:studio`                 | Drizzle Studio                                                                                        |
