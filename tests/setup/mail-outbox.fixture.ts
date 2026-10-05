import type { Env } from '@/config/env.schema';
import { DeliverEmailRepository } from '@/mail/deliver-email/repositories/DeliverEmail.repository';
import type { ClaimedEmail } from '@/mail/deliver-email/repositories/DeliverEmail.repository';
import { DeliverEmailService } from '@/mail/deliver-email/services/DeliverEmail.service';
import type { MailMessage } from '@/mail/mail.transport';
import { MailerService } from '@/mail/mailer.service';
import { securityServices, testEnv } from './security.fixture';

/** No database or transport: exercise the worker with real encrypted payloads. */
export function mailDelivery(overrides: Partial<Env> = {}) {
  const env = { ...testEnv, NODE_ENV: 'test' as const, ...overrides };
  const { cipher } = securityServices(env);
  const message: MailMessage = {
    from: 'Sender <sender@example.com>',
    to: 'ada@example.com',
    subject: 'Verify your email',
    text: 'https://example.com/verify-email?token=secret-link-token',
    html: '<a href="https://example.com/verify-email?token=secret-link-token">Verify</a>',
  };
  const job: ClaimedEmail = {
    id: '11111111-1111-4111-8111-111111111111',
    leaseId: '22222222-2222-4222-8222-222222222222',
    encryptedPayload: cipher.encrypt(JSON.stringify(message)),
    attempts: 1,
  };
  const repository = {
    discardInvalid: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
    claim: jest.fn<Promise<ClaimedEmail | null>, [number]>().mockResolvedValue(null),
    renew: jest.fn<Promise<void>, [string, string, number]>().mockResolvedValue(undefined),
    retry: jest.fn<Promise<void>, [string, string, number]>().mockResolvedValue(undefined),
    complete: jest.fn<Promise<void>, [string, string]>().mockResolvedValue(undefined),
  };
  const mailer = { send: jest.fn<Promise<void>, [MailMessage]>().mockResolvedValue(undefined) };
  const service = new DeliverEmailService(
    repository as unknown as DeliverEmailRepository,
    mailer as unknown as MailerService,
    cipher,
    env,
  );
  return { service, repository, mailer, cipher, env, message, job };
}

/** Coordinate an in-flight send without sleeps, database access or network calls. */
export function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
