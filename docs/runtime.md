# Runtime

## HTTP contract and documentation

Every application JSON response includes `success`, `data` and `error`. Void actions return status `200` and
`{ success: true, data: null, error: null }`. The nine auth actions previously returning `204` now use this envelope;
clients and Bruno must expect `200`. CORS preflight retains the protocol's bodyless `204`, and Swagger serves HTML.

`ApiEnvelopeResponse` describes the same success and error contract in OpenAPI. Public result types derive from Zod
schemas, including login's authenticated and two-factor-required branches. Only `VALIDATION_ERROR` requires
`details: [{ path, message }]`. Handlers return plain data; the interceptor and exception filter shape the response.

The production bootstrap and HTTP tests share Helmet, CORS and proxy configuration. Local HTTP disables HSTS and CSP
HTTPS upgrades; production enables both. Configure `CORS_ORIGIN` explicitly and enable `TRUST_PROXY` only behind a proxy
that overwrites forwarded headers. API docs remain enabled outside production by default and can be overridden with
`API_DOCS_ENABLED`.

## Health and shutdown

`GET /health` is a cheap liveness check. `GET /health/readiness` checks PostgreSQL with a one-second deadline covering
pool acquisition and the query. A failed check returns `503` with `SERVICE_UNAVAILABLE`; it does not make liveness fail.
Both routes are public and exempt from throttling. Readiness discards a stalled connection and releases a checkout that
arrives after the deadline. Concurrent probes share the pending check.

Shutdown stops outbox polling, awaits the current delivery, closes HTTP connections, then closes the PostgreSQL pool.
Requests already admitted can finish their database work. Run the production process with a termination grace period
long enough for current requests and SMTP timeouts.

## Durable email delivery

Apply the new `mail_outbox` migration with `pnpm db:migrate` before starting the updated application. No Redis or
separate worker process is required: each application instance polls the PostgreSQL outbox.

Registration writes its account, profile, verification token and mail job in one transaction. Password recovery and
verification resend replace the token and queue its email together. Replacements serialize per user and token purpose
with a transaction-scoped advisory lock, so concurrent requests leave one current token and queued email. A failed queue
write rolls the transaction back; SMTP failures occur in the worker after the HTTP response succeeds.

The job contains an AES-256-GCM encrypted `MailMessage`, including its token-bearing link. The worker decrypts and
validates it only for delivery. It shares `TWO_FACTOR_ENCRYPTION_KEY` with TOTP encryption; keep that key unchanged
while pending jobs exist. Worker failure logs contain job identifiers and attempts, never payloads or SMTP exceptions.

Workers claim one due job under `FOR UPDATE SKIP LOCKED`, commit a lease, then contact SMTP outside the transaction.
Leases renew during slow delivery and expire after a worker crash. Failed sends use exponential backoff starting at
`MAIL_OUTBOX_RETRY_MS`, capped at one hour. Retries stop when the token expires or is consumed; replacing the token
deletes its obsolete job through the foreign key. Successful delivery deletes the encrypted job.

| Variable               | Default  | Meaning                                                   |
| ---------------------- | -------- | --------------------------------------------------------- |
| `MAIL_OUTBOX_POLL_MS`  | `1000`   | Time between delivery batches; up to 20 jobs per batch    |
| `MAIL_OUTBOX_RETRY_MS` | `5000`   | Initial retry delay, doubled after each failed attempt    |
| `MAIL_OUTBOX_LEASE_MS` | `120000` | Renewable claim duration and recovery delay after a crash |

Delivery is at least once. If SMTP accepts a message and the process dies before deleting its job, the recovered worker
can send the same message again. The token remains single-use; the outbox does not claim exactly-once SMTP delivery.
Monitor retry logs and pending job age so sustained delivery failures are visible.

In development, the log transport prints delivered messages after polling. Tests disable background polling and await
delivery through their HTTP helper, making captured-mail assertions deterministic. Dedicated feature tests exercise SMTP
failure, retry, rollback, obsolete tokens and independent workers; runtime tests exercise real throttling.
