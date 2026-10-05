import { mailOutbox, verificationTokens } from '@/database/schema';
import { MailOutboxRepository } from '@/mail/shared/repositories/MailOutbox.repository';
import { mailReplacement } from '@tests/setup/mail-replacement.fixture';
import { useTestApp } from '@tests/setup/test-app';

const ctx = useTestApp();

afterEach(() => jest.restoreAllMocks());

describe('Token replacement rollback (e2e)', () => {
  it.each(['password_reset', 'email_verification'] as const)(
    'retains the original %s token and email when enqueueing its replacement fails',
    async (purpose) => {
      const { t } = ctx;
      const flow = await mailReplacement(t, purpose);
      await flow.replace(flow.input('original-token'));
      const originalTokens = await t.db.select().from(verificationTokens);
      const originalMail = await t.db.select().from(mailOutbox);
      jest.spyOn(t.app.get(MailOutboxRepository), 'enqueue').mockRejectedValueOnce(new Error('Outbox write failed'));

      await expect(flow.replace(flow.input('replacement-token'))).rejects.toThrow('Outbox write failed');

      expect(await t.db.select().from(verificationTokens)).toEqual(originalTokens);
      expect(await t.db.select().from(mailOutbox)).toEqual(originalMail);
      expect(t.mail.sent).toHaveLength(0);
    },
  );
});
