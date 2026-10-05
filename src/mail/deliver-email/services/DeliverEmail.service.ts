import {
  BeforeApplicationShutdown,
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import type { Env } from '@/config/env.schema';
import { ENV } from '@/config/env.token';
import { MailerService } from '@/mail/mailer.service';
import { mailMessageSchema } from '@/mail/mail-message.schema';
import { DeliverEmailRepository } from '@/mail/deliver-email/repositories/DeliverEmail.repository';
import { SecretCipher } from '@/security/secret-cipher.service';

const MAX_RETRY_MS = 60 * 60 * 1000;
const BATCH_SIZE = 20;

@Injectable()
export class DeliverEmailService implements OnApplicationBootstrap, OnModuleDestroy, BeforeApplicationShutdown {
  private readonly logger = new Logger(DeliverEmailService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running: Promise<void> | null = null;

  constructor(
    private readonly repository: DeliverEmailRepository,
    private readonly mailer: MailerService,
    private readonly cipher: SecretCipher,
    @Inject(ENV) private readonly env: Env,
  ) {}

  onApplicationBootstrap(): void {
    // Tests await handle() after requests; background delivery would make those assertions race.
    if (this.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => {
      void this.handle().catch(() => this.logger.error('Mail outbox polling failed; the next poll will retry'));
    }, this.env.MAIL_OUTBOX_POLL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async beforeApplicationShutdown(): Promise<void> {
    // Finish the current delivery before the HTTP server and database pool close.
    await this.running?.catch(() => this.logger.error('Mail delivery interrupted; its lease permits a later retry'));
  }

  handle(): Promise<void> {
    if (this.running) return this.running;
    this.running = this.deliverBatch().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private async deliverBatch(): Promise<void> {
    await this.repository.discardInvalid();
    for (let index = 0; index < BATCH_SIZE; index += 1) {
      const job = await this.repository.claim(this.env.MAIL_OUTBOX_LEASE_MS);
      if (!job) return;
      const heartbeat = setInterval(() => {
        void this.repository
          .renew(job.id, job.leaseId, this.env.MAIL_OUTBOX_LEASE_MS)
          .catch(() => this.logger.error(`Email job ${job.id} lease renewal failed`));
      }, this.env.MAIL_OUTBOX_LEASE_MS / 3);
      heartbeat.unref();
      try {
        const message = mailMessageSchema.parse(JSON.parse(this.cipher.decrypt(job.encryptedPayload)));
        await this.mailer.send(message);
      } catch {
        const delay = Math.min(MAX_RETRY_MS, this.env.MAIL_OUTBOX_RETRY_MS * 2 ** Math.min(job.attempts - 1, 16));
        await this.repository.retry(job.id, job.leaseId, delay);
        // Never log the payload, SMTP error or token-bearing link.
        this.logger.warn(`Email job ${job.id} failed on attempt ${job.attempts}; retry scheduled`);
        continue;
      } finally {
        clearInterval(heartbeat);
      }
      // A crash after SMTP accepts a message can deliver it twice: delivery is at least once.
      await this.repository.complete(job.id, job.leaseId);
    }
  }
}
