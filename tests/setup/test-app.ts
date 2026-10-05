import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '@/app.module';
import type { Envelope, ErrorBody, FieldIssue } from '@/common/envelope';
import { ENV } from '@/config/env.token';
import { setupApiDocs } from '@/config/api-docs';
import { configureHttpApp } from '@/config/http-app';
import type { Env } from '@/config/env.schema';
import { Database, DRIZZLE } from '@/database/database.tokens';
import { MAIL_TRANSPORT } from '@/mail/mail.transport';
import { MemoryMailTransport } from '@/mail/transports/memory.transport';
import { DeliverEmailService } from '@/mail/deliver-email/services/DeliverEmail.service';
import { httpWithMail } from './http-with-mail';
import { listenOn, TEST_PORT } from './http-server';

export { TEST_PORT } from './http-server';

export interface TestApp {
  app: INestApplication<App>;
  http: () => request.Agent;
  mail: MemoryMailTransport;
  db: Database;
  close: () => Promise<void>;
}

export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  const env = app.get<Env>(ENV);
  configureHttpApp(app, env);
  setupApiDocs(app, env);
  await app.init();
  // The suites must never reach a third party: it makes them slow, flaky and dependent on someone else's uptime.
  // .env.test switches the breach lookup off; fail loudly rather than silently calling out.
  if (env.PASSWORD_BREACH_CHECK) {
    await app.close();
    throw new Error('PASSWORD_BREACH_CHECK must be false in .env.test; tests must not call Have I Been Pwned');
  }

  // `app.init()` wires the app but binds no socket, so supertest would `listen(0)` and `close()`
  // around every single request. Closing is asynchronous while `address()` still reports the old
  // port, so the next request can be sent to a port the kernel has already recycled to another
  // process. Binding once keeps `address()` non-null for the file's lifetime, which makes
  // supertest skip its bind/close branch entirely. The port sits below the ephemeral range
  // (49152-65535 here) so nothing else is ever assigned it.
  await listenOn(app, TEST_PORT);

  const mail = app.get<MemoryMailTransport>(MAIL_TRANSPORT);
  const db = app.get<Database>(DRIZZLE);
  const delivery = app.get(DeliverEmailService);
  return {
    app,
    http: () => httpWithMail(app.getHttpServer(), () => delivery.handle()),
    mail,
    db,
    close: () => app.close(),
  };
}

export type { Envelope, ErrorBody, FieldIssue };

export function bodyOf<T = unknown>(response: request.Response): Envelope<T> {
  return response.body as Envelope<T>;
}

/** The `data` of a success envelope; fails loudly on an error envelope or an empty payload. */
export function dataOf<T = unknown>(response: request.Response): T {
  const body = bodyOf<T>(response);
  if (!body.success) {
    throw new Error(`expected a success envelope, got ${body.error.code}`);
  }
  if (body.data === null) throw new Error('expected a success envelope carrying data, got null');
  return body.data;
}

/** The `error` of an error envelope, with `details` always present. */
export function errorOf(response: request.Response): ErrorBody & { details: FieldIssue[] } {
  const body = bodyOf(response);
  if (body.success) throw new Error('expected an error envelope');
  return { ...body.error, details: body.error.details ?? [] };
}

export const errorCodeOf = (response: request.Response): string => errorOf(response).code;

export interface TestAppRef {
  /** The running app; only valid inside tests and hooks. */
  readonly t: TestApp;
}

/**
 * Registers the hooks every e2e file needs: boot once, truncate the database
 * and clear captured mail before each test, close afterwards.
 */
export function useTestApp(): TestAppRef {
  let app: TestApp | undefined;
  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    if (!app) throw new Error('test app has not started');
    await resetDatabase(app.db);
    app.mail.clear();
  });
  afterAll(async () => {
    await app?.close();
  });
  return {
    get t(): TestApp {
      if (!app) throw new Error('test app has not started');
      return app;
    },
  };
}

export async function resetDatabase(db: Database): Promise<void> {
  await db.execute(
    sql`truncate table users, profiles, sessions, verification_tokens, two_factor_recovery_codes, mail_outbox cascade`,
  );
}

/** Pulls the token out of the last email's dashboard link. */
export function lastMailToken(mail: MemoryMailTransport): string {
  const text = mail.last()?.text ?? '';
  const match = text.match(/token=([^\s]+)/);
  if (!match) throw new Error('no token link in last email');
  return decodeURIComponent(match[1]);
}

export const PASSWORD = 'correct horse battery staple';
export const USER_AGENT = 'zitd-e2e';
export const FIRST_NAME = 'Ada';
export const LAST_NAME = 'Lovelace';
export const AVATAR_URL = 'https://cdn.example.com/avatars/ada.png';

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface Registration {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/** A complete register body, so a spec about something else never has to spell out the name fields. */
export function registration(overrides: Partial<Registration> = {}): Registration {
  return {
    email: 'ada@example.com',
    password: PASSWORD,
    firstName: FIRST_NAME,
    lastName: LAST_NAME,
    ...overrides,
  };
}

/** Registers, verifies the email and logs in; returns a ready session. */
export async function registerAndLogin(t: TestApp, email: string, password: string = PASSWORD): Promise<Tokens> {
  const registered = await t.http().post('/auth/register').send(registration({ email, password }));
  expectStatus(registered, 201, 'POST /auth/register');
  const token = lastMailToken(t.mail);
  const verified = await t.http().post('/auth/verify-email').send({ token });
  expectStatus(verified, 200, 'POST /auth/verify-email');
  return login(t, email, password);
}

/** Fails with the body and headers, which `supertest.expect(code)` throws away. */
function expectStatus(response: request.Response, status: number, what: string): void {
  if (response.status === status) return;
  throw new Error(
    `${what} answered ${response.status}, expected ${status}\n` +
      `  body: ${JSON.stringify(response.body)}\n` +
      `  text: ${response.text?.slice(0, 300)}\n` +
      `  content-type: ${response.headers['content-type']}`,
  );
}

export async function login(t: TestApp, email: string, password: string = PASSWORD): Promise<Tokens> {
  const response = await t.http().post('/auth/login').set('User-Agent', USER_AGENT).send({ email, password });
  expectStatus(response, 200, 'POST /auth/login');
  const data = dataOf<Tokens & { status: string }>(response);
  if (data.status !== 'authenticated') throw new Error(`login returned ${data.status}`);
  return { accessToken: data.accessToken, refreshToken: data.refreshToken };
}

export const bearer = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
});
