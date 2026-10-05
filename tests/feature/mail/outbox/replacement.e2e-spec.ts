import { sql } from 'drizzle-orm';
import { VerificationTokenRepository } from '@/auth/shared/repositories/VerificationToken.repository';
import { mailOutbox, verificationTokens } from '@/database/schema';
import { MailOutboxRepository } from '@/mail/shared/repositories/MailOutbox.repository';
import { deferred } from '@tests/setup/mail-outbox.fixture';
import { mailReplacement } from '@tests/setup/mail-replacement.fixture';
import { useTestApp } from '@tests/setup/test-app';

const ctx = useTestApp();

afterEach(() => jest.restoreAllMocks());

describe('Concurrent token replacements (e2e)', () => {
  it.each(['password_reset', 'email_verification'] as const)(
    'keeps one pending token and email when %s replacements overlap',
    async (purpose) => {
      const { t } = ctx;
      const flow = await mailReplacement(t, purpose);
      const first = flow.input('first-token');
      const second = flow.input('second-token');
      const firstQueued = deferred();
      const releaseFirst = deferred();
      const secondProbed = deferred();
      const outbox = t.app.get(MailOutboxRepository);
      const enqueue = outbox.enqueue.bind(outbox);
      jest.spyOn(outbox, 'enqueue').mockImplementation(async (input, on) => {
        await enqueue(input, on);
        if (input.tokenHash === first.tokenHash) {
          firstQueued.resolve();
          await releaseFirst.promise;
        }
      });
      const tokens = t.app.get(VerificationTokenRepository);
      const replace = tokens.replace.bind(tokens);
      let secondAcquiredLock: boolean | undefined;
      jest.spyOn(tokens, 'replace').mockImplementation(async (input, on) => {
        if (input.tokenHash === second.tokenHash) {
          if (!on) throw new Error('Flow replacement did not pass its transaction');
          // Probe without waiting: the first transaction must retain its lock through the queued email.
          const result = await on.execute<{ acquired: boolean }>(sql`
            select pg_try_advisory_xact_lock(hashtextextended(${`${input.userId}:${input.purpose}`}, 0)) as acquired
          `);
          secondAcquiredLock = result.rows[0].acquired;
          secondProbed.resolve();
        }
        await replace(input, on);
      });
      const firstRun = flow.replace(first);
      await Promise.race([
        firstQueued.promise,
        firstRun.then(() => {
          throw new Error('First replacement finished without queueing its email');
        }),
      ]);
      const secondRun = flow.replace(second);
      try {
        await Promise.race([
          secondProbed.promise,
          secondRun.then(() => {
            throw new Error('Second replacement finished without probing its lock');
          }),
        ]);
        expect(secondAcquiredLock).toBe(false);
      } finally {
        releaseFirst.resolve();
        await Promise.all([firstRun, secondRun]);
      }

      const pendingTokens = await t.db.select().from(verificationTokens);
      expect(pendingTokens).toHaveLength(1);
      expect(pendingTokens[0]).toMatchObject({ userId: flow.userId, purpose, tokenHash: second.tokenHash });
      const pendingMail = await t.db.select().from(mailOutbox);
      expect(pendingMail).toHaveLength(1);
      expect(pendingMail[0]).toMatchObject({ tokenHash: second.tokenHash, encryptedPayload: second.encryptedPayload });
      expect(t.mail.sent).toHaveLength(0);
    },
  );
});
