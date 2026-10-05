import { ModuleRef } from '@nestjs/core';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { mailOutbox } from '@/database/schema';
import { DeliverEmailModule } from '@/mail/deliver-email/deliver-email.module';
import { DeliverEmailService } from '@/mail/deliver-email/services/DeliverEmail.service';
import { MailerService } from '@/mail/mailer.service';
import { registration, useTestApp } from '@tests/setup/test-app';

const ctx = useTestApp();

afterEach(() => jest.restoreAllMocks());

describe('Outbox worker leases (e2e)', () => {
  it('does not deliver a claimed email from a second independent worker', async () => {
    const { t } = ctx;
    const delivery = jest.spyOn(t.app.get(MailerService), 'send').mockRejectedValueOnce(new Error('SMTP unavailable'));
    await t.http().post('/auth/register').send(registration()).expect(201);
    const [pending] = await t.db.select().from(mailOutbox);
    await t.db
      .update(mailOutbox)
      .set({ availableAt: new Date(Date.now() - 1000) })
      .where(eq(mailOutbox.id, pending.id));
    delivery.mockClear();

    let signalSend: () => void = () => undefined;
    const sendStarted = new Promise<void>((resolve) => {
      signalSend = resolve;
    });
    let releaseSend: () => void = () => undefined;
    const sendReleased = new Promise<void>((resolve) => {
      releaseSend = resolve;
    });
    delivery.mockImplementation(async (message) => {
      signalSend();
      await sendReleased;
      await t.mail.send(message);
    });
    const first = t.app.get(DeliverEmailService);
    const moduleRef = t.app.select(DeliverEmailModule).get(ModuleRef, { strict: true });
    const second = await moduleRef.create(DeliverEmailService);
    expect(second).not.toBe(first);
    const firstRun = first.handle();
    try {
      await Promise.race([
        sendStarted,
        firstRun.then(() => {
          throw new Error('The first worker finished without starting email delivery');
        }),
      ]);
      await second.handle();

      expect(delivery).toHaveBeenCalledTimes(1);
      const [leased] = await t.db.select().from(mailOutbox);
      expect(leased.attempts).toBe(2);
      expect(leased.leaseId).not.toBeNull();
      expect(leased.leaseUntil?.getTime()).toBeGreaterThan(Date.now());
    } finally {
      releaseSend();
      await firstRun;
    }

    expect(t.mail.sent).toHaveLength(1);
    expect(await t.db.select().from(mailOutbox)).toHaveLength(0);
  });

  it('reclaims work after an abandoned worker lease expires', async () => {
    const { t } = ctx;
    const delivery = jest.spyOn(t.app.get(MailerService), 'send').mockRejectedValueOnce(new Error('SMTP unavailable'));
    await t.http().post('/auth/register').send(registration()).expect(201);
    const [pending] = await t.db.select().from(mailOutbox);
    await t.db
      .update(mailOutbox)
      .set({
        leaseId: randomUUID(),
        leaseUntil: new Date(Date.now() - 1000),
        availableAt: new Date(Date.now() - 1000),
      })
      .where(eq(mailOutbox.id, pending.id));

    await t.app.get(DeliverEmailService).handle();

    expect(delivery).toHaveBeenCalledTimes(2);
    expect(t.mail.sent).toHaveLength(1);
    expect(await t.db.select().from(mailOutbox)).toHaveLength(0);
  });
});
