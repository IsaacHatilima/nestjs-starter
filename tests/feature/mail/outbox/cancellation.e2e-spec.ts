import { eq } from 'drizzle-orm';
import { mailOutbox, verificationTokens } from '@/database/schema';
import { DeliverEmailService } from '@/mail/deliver-email/services/DeliverEmail.service';
import type { MailMessage } from '@/mail/mail.transport';
import { MailerService } from '@/mail/mailer.service';
import { SecretCipher } from '@/security/secret-cipher.service';
import { TokenService } from '@/security/token.service';
import { lastMailToken, registration, useTestApp } from '@tests/setup/test-app';

const ctx = useTestApp();

afterEach(() => jest.restoreAllMocks());

describe('Obsolete outbox emails (e2e)', () => {
  it('replaces a pending verification email without delivering its obsolete link', async () => {
    const { t } = ctx;
    const delivery = jest
      .spyOn(t.app.get(MailerService), 'send')
      .mockRejectedValueOnce(new Error('SMTP unavailable'))
      .mockRejectedValueOnce(new Error('SMTP still unavailable'));
    await t.http().post('/auth/register').send(registration()).expect(201);
    const [first] = await t.db.select().from(mailOutbox);

    await t.http().post('/auth/resend-verification').send({ email: 'ada@example.com' }).expect(200);

    const pending = await t.db.select().from(mailOutbox);
    expect(pending).toHaveLength(1);
    expect(pending[0].tokenHash).not.toBe(first.tokenHash);
    expect(
      await t.db.select().from(verificationTokens).where(eq(verificationTokens.tokenHash, first.tokenHash)),
    ).toEqual([]);
    await t.db
      .update(mailOutbox)
      .set({ availableAt: new Date(Date.now() - 1000) })
      .where(eq(mailOutbox.id, pending[0].id));
    await t.app.get(DeliverEmailService).handle();

    expect(delivery).toHaveBeenCalledTimes(3);
    expect(t.mail.sent).toHaveLength(1);
    expect(t.app.get(TokenService).hashOpaqueToken(lastMailToken(t.mail))).toBe(pending[0].tokenHash);
    expect(await t.db.select().from(mailOutbox)).toHaveLength(0);
  });

  it('discards an email after its token has already been consumed', async () => {
    const { t } = ctx;
    const delivery = jest.spyOn(t.app.get(MailerService), 'send').mockRejectedValueOnce(new Error('SMTP unavailable'));
    await t.http().post('/auth/register').send(registration()).expect(201);
    const [pending] = await t.db.select().from(mailOutbox);
    const message = JSON.parse(t.app.get(SecretCipher).decrypt(pending.encryptedPayload)) as MailMessage;
    const match = message.text.match(/token=([^\s]+)/);
    if (!match) throw new Error('Queued email has no verification token');

    await t
      .http()
      .post('/auth/verify-email')
      .send({ token: decodeURIComponent(match[1]) })
      .expect(200);

    expect(delivery).toHaveBeenCalledTimes(1);
    expect(t.mail.sent).toHaveLength(0);
    expect(await t.db.select().from(mailOutbox)).toHaveLength(0);
  });

  it('discards expired emails even before their next retry is due', async () => {
    const { t } = ctx;
    const delivery = jest.spyOn(t.app.get(MailerService), 'send').mockRejectedValueOnce(new Error('SMTP unavailable'));
    await t.http().post('/auth/register').send(registration()).expect(201);
    const [pending] = await t.db.select().from(mailOutbox);
    await t.db
      .update(verificationTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(verificationTokens.tokenHash, pending.tokenHash));

    await t.app.get(DeliverEmailService).handle();

    expect(delivery).toHaveBeenCalledTimes(1);
    expect(t.mail.sent).toHaveLength(0);
    expect(await t.db.select().from(mailOutbox)).toHaveLength(0);
  });
});
