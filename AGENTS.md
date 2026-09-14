# zitd-api agent guide

The single source of agent guidance for this project. `CLAUDE.md` only points here.

<!-- prettier-ignore-start -->
<!-- domain-driver:start -->
## Scaffolding with domain-driver

This project uses [domain-driver](https://github.com/IsaacHatilima/domain-driver) to scaffold feature folders. Scaffold first, then fill in the generated files. Do not hand-write a layer the tool can generate.

- New feature: `npx domain-driver make:feature <feature>/<Entity> -a`
- One layer in an existing feature: `npx domain-driver make:<layer> <feature>/<Entity>` where layer is types, schema, repository, service, controller, component, container, or hook
- Any operation that is not List, Show, Create, Update, or Delete: `npx domain-driver make:action <feature>/<Entity> <actionName>`. Add `--with-input` when it takes a request body and `--returns one|void` when it does not return a list.

Rules the generated code follows, and that new code must keep:

- One file per action per layer. `findActiveUsers` gets `FindActiveUsers.service.ts`, `FindActiveUsers.repository.ts`, and `FindActiveUsers.controller.ts`. It never goes inside `ShowUser.service.ts` or `ListUser.service.ts`.
- Hooks are one file per action too: `<Action><Entity>.hook.ts` exporting `use<Action><Entity>` (for example `useListUser`, `useCreateUser`). There is no combined `use<Entity>.ts`.
- The chain is controller or hook, then service, then repository. Business logic lives in services. Data access lives in repositories. Controllers validate input and call one service.
- Feature folders are kebab-case (`coffee-type`). Entity, action, and class names are PascalCase (`CoffeeType`, `FindActiveUsers`).
- Generated repositories throw until you wire them to your data source. Generated controllers on Node need a line in `<feature>.routes.ts`, and on Nest need registering in `<feature>.module.ts`; the tool prints the exact line.

Full guidance: `.claude/skills/domain-driver/SKILL.md`. Re-run `npx domain-driver init` after upgrading domain-driver to refresh this section.
<!-- domain-driver:end -->
<!-- prettier-ignore-end -->

## Layout rules

- Flows are grouped into areas: `src/auth/` authenticates a caller, `src/profile/` holds what a client renders about
  them. A new operation that is not about proving who someone is belongs in its own area, not in `auth`.
- One feature folder per flow under `src/<area>/<flow>/` (`login`, `register`, `setup-totp`, `update-profile`, ...). A
  flow never gains a second action; a new operation is a new flow folder.
- Scaffold at the project root, then move the folder under its area and import its module in
  `src/<area>/<area>.module.ts`: `pnpm scaffold make:feature <flow>` and
  `pnpm scaffold make:action <flow>/<ReturnType> <flowAction> [--with-input] [--returns one|list|void]`, then
  `mv src/<flow> src/<area>/<flow>`. A new area also needs its `<area>.module.ts` imported in `src/app.module.ts`.
- Controllers use `@Controller('<area>')` so every route is `/<area>/<flow-slug>`. An area with a single resource drops
  the slug, which is why the profile flow is `PATCH /profile` rather than `/profile/update-profile`. Actions the tool
  scaffolds as `GET` but that change state are switched to `@Post()` or `@Patch()`.
- Types used by more than one flow live in `src/<area>/shared/`. Auth's is `SharedModule`; every other area names its
  own after the area (`ProfileSharedModule`), because the auth flows that build a `User` import both. Infrastructure
  (hashing, tokens, TOTP, database, mail, config, envelope) lives in `src/security`, `src/database`, `src/mail`,
  `src/config`, `src/common`.

## Data access

- A repository owns the SQL it runs. There is no separate query layer: `src/database/` holds the Drizzle module, schema
  and migrations only.
- SQL that a single flow needs lives in that flow's `src/<area>/<flow>/repositories/<Flow>.repository.ts`.
- SQL that more than one flow needs lives in `src/<area>/shared/repositories/<Entity>.repository.ts`, and the flow
  module imports that area's shared module. These speak in table rows; mapping rows to domain types, translating
  database errors to domain errors and opening transactions stay in the flow repository.
- A table belongs to the area that owns it, even when another area reads it. `profiles` is reached through
  `ProfileRepository` from the auth flows that build a `User`, never by joining it into auth's `UserRepository`. That
  costs one extra query on login and `/auth/me`, and it is the price of the boundary: keep it.
- Shared repository methods take domain arguments only — `findByEmail(email)`, never `findByEmail(db, email)`. A method
  that a caller runs inside a transaction takes an optional trailing `on: Executor = this.db`; pass `tx` to it from
  within `db.transaction(...)`, and omit it everywhere else. Passing the wrong executor is not a type error and not
  visible at runtime until a rollback, so never widen this beyond the methods that need it.
- Services never touch `Database`, `DRIZZLE`, `transaction` or a schema table.

## Test rules

- Tests live under `tests/`, never in `src`. `src` holds no spec files and no fixtures.
- `tests/unit/` mirrors `src/`, so `src/auth/login/services/Login.service.ts` is tested by
  `tests/unit/auth/login/services/Login.service.spec.ts`. These run with no database and no network: mock the
  repository, use the real security services from `tests/setup/security.fixture.ts`.
- `tests/feature/<area>/<flow>.e2e-spec.ts` holds the end-to-end tests, one file per flow, for anything that needs the
  running app or the database. Split into `tests/feature/<area>/<flow>/<behaviour>.e2e-spec.ts` once a flow needs more
  than one file.
- `tests/setup/` holds shared infrastructure: `useTestApp`, the journey helpers, the fixtures and the global setup.
  Shared journeys go here rather than being copied between files.
- Many small files, never one file per area. Split by flow, and by behaviour inside a flow once a file passes about 150
  lines.
- Unit specs end in `.spec.ts` and end-to-end specs in `.e2e-spec.ts`; the two Jest projects select on that.
- Commands: `pnpm test` (unit, no database), `pnpm test:e2e` (needs `zitd_api_test`, see `.env.test`), `pnpm test:cov`
  (both, with the 80 % threshold).
- Never run two database-backed suites at once. Every one of them truncates `zitd_api_test` between tests, so a second
  run deletes the first run's rows and both fail in ways that look random. `--runInBand` is set for exactly this reason;
  check for a stray `jest` process before believing an intermittent failure.
- A timeout belongs at the root of `jest.coverage.config.js`, not only in `tests/jest-e2e.json`. Once a config runs
  under `projects` its own `testTimeout` is ignored, and argon2 under coverage overruns Jest's 5s default.
- Never leave a replaced global in place. A spec that assigns `globalThis.fetch` restores it in `afterEach`, or every
  later suite in the run inherits the mock.
- `pnpm test:cov` still fails about one test in ten, on a different test each time, and `pnpm test:e2e` does not. It is
  a known open issue, recorded in the design spec; re-run before assuming a change caused it, and do not paper over it
  with retries.

## Response envelope

- Every response carries all three keys: `{ success, data, error }`. Success sets `error: null`, failure sets
  `data: null`. Handlers return plain data; `ResponseEnvelopeInterceptor` and `HttpExceptionFilter` shape it. The
  contract itself lives in `src/common/envelope.ts`, and tests import it from there rather than redeclaring it.
- `error.code` is the client's branching key, never `error.message` and never the HTTP status alone. Statuses collide:
  five codes share `401`, four share `400`. New codes go in `src/common/errors/error-codes.ts` and are thrown through an
  `AppError` factory in `src/common/errors/auth-errors.ts`.
- `VALIDATION_ERROR` belongs to schema failures only, where `details: [{ path, message }]` is always present. A `400`
  from anywhere else is `BAD_REQUEST`. Never map a bare status onto a code that promises a payload it cannot supply.

- E2e suites bind one server per file on `TEST_PORT` (1992) in `createTestApp`. Do not go back to letting supertest
  bind: with no listener it runs `listen(0)`/`close()` around every request, and because `close()` is asynchronous while
  `address()` still reports the old port, requests land on ports the kernel has recycled to other processes. That failed
  roughly a quarter of back-to-back runs with symptoms that look like anything but a port: stray 404s, 503s, socket hang
  ups, and replies from unrelated local servers.

## Bruno collection and route docs

- Every route has a request file in `bruno/`, in the OpenCollection YAML format Bruno 3 reads, named after the flow
  folder in `src/`. A public route is `bruno/<area>/<flow>.yml` (`src/auth/login/` has `bruno/auth/login.yml`); one that
  needs a bearer token is `bruno/<area>/protected/<flow>.yml`. A new route without its request file is not done.
- The bearer scheme is defined once, on `bruno/<area>/protected/folder.yml`, never repeated in a request. Requests
  inside it still carry `auth: inherit`: Bruno reads a missing `auth` key as "none", not as "inherit", so dropping the
  line turns the request public and it answers 401. A folder's auth overrides the collection's, which is what makes the
  folder the single place to change the scheme.
- A request file has `info` (name, `type: http`, `seq` in journey order), `http` (method, `url: "{{baseUrl}}/..."`, JSON
  body, `auth: inherit` for bearer routes or `auth.type: none` for public ones), `runtime` (an `after-response` script
  that stores tokens later requests need, one status assertion), `settings`, and a `docs` block naming the error codes.
- Request payload is written into the request file as literal JSON, headers or parameters, never added to the
  environment: a name, an avatar URL, a code, and a token you paste from an email or an earlier response all belong in
  the body of the one request that sends them. A placeholder says what to paste (`paste-the-token-from-the-reset-email`)
  rather than pretending to be a real value.
- `bruno/environments/Local.yml` holds only what is genuinely collection-wide: `baseUrl`, and the account `email` and
  `password` that Register and Login have to agree on. Adding a variable there for one request's payload is the mistake
  this rule exists to stop.
- A value produced by one request and consumed by a later one is a runtime variable, not an environment one: the
  producer's `after-response` script calls `bru.setVar`, as Login does for `accessToken`. It never goes in `Local.yml`.
- A new area gets `bruno/<area>/folder.yml`.
- Add the route to `bruno/ROUTES.md` and, when a folder is added, to `docs/layout.md`.

## Imports

- Import across directories with the `@/` alias for `src` and `@tests/` for `tests`, never `../..`. A sibling in the
  same folder stays `./`. The aliases are declared in `tsconfig.json`, mapped for Jest in `package.json` and
  `tests/jest-e2e.json`, and rewritten into the build by `tsc-alias`, which `pnpm build` runs after `nest build`.
- `tsc` type-checks aliases but does not rewrite them when it emits JavaScript, so never drop the `tsc-alias` step or
  `node dist/main.js` fails at require time.
- One exception: `tests/setup/global-setup.ts`. Jest loads it outside its module registry, where `moduleNameMapper` does
  not apply, so it imports `src` relatively.

## Password blocklist

- The list lives in `src/security/blocklist/`: `current.txt` is enforced, `current.json` records its source, SHA-256 and
  install date, `archive/` keeps every version it replaced, and `HISTORY.md` is the trail. Never edit any of them by
  hand.
- `pnpm blocklist:update` fetches, validates, archives the old list and installs the new one; `--dry-run` checks without
  writing and `--source <url>` overrides the default. It is all-or-nothing: any failure restores the previous three
  files and exits non-zero. `pnpm blocklist:check` verifies `current.txt` still matches its manifest, and belongs in CI.
- Adding a source means passing `--source`, not editing the list. A download that lacks the canary entries, is HTML, or
  holds fewer than 100 entries is rejected before anything is touched.
- Only `current.txt` and `current.json` are copied into `dist`, through `assets` in `nest-cli.json`. The archive stays
  in the repository.

## Line length

- 120 characters is the maximum for every line in every file: TypeScript, tests, Markdown, YAML, JSON and comments
  alike. `printWidth` in `.prettierrc` and the `max-len` ESLint rule enforce it.
- Prettier reflows code and Markdown prose but never comments, so wrap long `//` and `/** */` comments by hand.
- Exempt, because breaking them would corrupt them: Markdown table rows, a URL or generated value that cannot be split,
  and the `domain-driver` section above, which is fenced with `prettier-ignore` so the tool keeps recognising its own
  bytes.
- `pnpm format` fixes what is fixable; `pnpm lint` fails on what is left.

## Before finishing any change

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e && pnpm build
```
