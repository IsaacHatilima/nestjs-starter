import { eq } from 'drizzle-orm';
import { mailOutbox, profiles, users, verificationTokens } from '@/database/schema';
import { DeliverEmailService } from '@/mail/deliver-email/services/DeliverEmail.service';
import type { MailMessage } from '@/mail/mail.transport';
import { MailerService } from '@/mail/mailer.service';
import { MailOutboxRepository } from '@/mail/shared/repositories/MailOutbox.repository';
import { SecretCipher } from '@/security/secret-cipher.service';
import { TokenService } from '@/security/token.service';
import { dataOf, lastMailToken, registration, useTestApp } from '@tests/setup/test-app';

const ctx = useTestApp();

afterEach(() => jest.restoreAllMocks());

describe('Durable email delivery (e2e)', () => {
  it('keeps registration successful and its encrypted email retryable when SMTP fails', async () => {
    const { t } = ctx;
    const mailer = t.app.get(MailerService);
    const delivery = jest.spyOn(mailer, 'send').mockRejectedValueOnce(new Error('SMTP unavailable'));

    const response = await t.http().post('/auth/register').send(registration()).expect(201);

    expect(dataOf(response)).toMatchObject({ email: 'ada@example.com', emailVerified: false });
    expect(t.mail.sent).toHaveLength(0);
    const [pending] = await t.db.select().from(mailOutbox);
    expect(pending).toBeDefined();
    expect(pending.attempts).toBe(1);
    expect(pending.availableAt.getTime()).toBeGreaterThan(Date.now());
    expect(pending.leaseId).toBeNull();
    expect(pending.leaseUntil).toBeNull();
    const encryptedMessage = t.app.get(SecretCipher).decrypt(pending.encryptedPayload);
    const message = JSON.parse(encryptedMessage) as MailMessage;
    expect(message.to).toBe('ada@example.com');
    expect(message.text).toContain('/verify-email?token=');
    expect(pending.encryptedPayload).not.toContain('ada@example.com');
    expect(pending.encryptedPayload).not.toContain('/verify-email?token=');
    const [storedToken] = await t.db.select().from(verificationTokens);
    expect(storedToken.tokenHash).toBe(pending.tokenHash);

    // Make the scheduled retry due without sleeping or altering the worker's clock.
    await t.db
      .update(mailOutbox)
      .set({ availableAt: new Date(Date.now() - 1000) })
      .where(eq(mailOutbox.id, pending.id));
    await t.app.get(DeliverEmailService).handle();

    expect(delivery).toHaveBeenCalledTimes(2);
    expect(t.mail.sent).toEqual([message]);
    expect(t.app.get(TokenService).hashOpaqueToken(lastMailToken(t.mail))).toBe(pending.tokenHash);
    expect(await t.db.select().from(mailOutbox)).toHaveLength(0);
  });

  it('rolls the account, profile and token back when its email cannot be queued', async () => {
    const { t } = ctx;
    jest.spyOn(t.app.get(MailOutboxRepository), 'enqueue').mockRejectedValueOnce(new Error('Outbox write failed'));

    await t.http().post('/auth/register').send(registration()).expect(500);

    expect(await t.db.select().from(users)).toHaveLength(0);
    expect(await t.db.select().from(profiles)).toHaveLength(0);
    expect(await t.db.select().from(verificationTokens)).toHaveLength(0);
    expect(await t.db.select().from(mailOutbox)).toHaveLength(0);
    expect(t.mail.sent).toHaveLength(0);
  });
});
