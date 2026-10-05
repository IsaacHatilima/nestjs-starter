import { Module } from '@nestjs/common';
import type { Env } from '@/config/env.schema';
import { ENV } from '@/config/env.token';
import { MAIL_TRANSPORT, type MailTransport } from '@/mail/mail.transport';
import { MailerService } from '@/mail/mailer.service';
import { LogMailTransport } from '@/mail/transports/log.transport';
import { MemoryMailTransport } from '@/mail/transports/memory.transport';
import { SmtpMailTransport } from '@/mail/transports/smtp.transport';
import { MailOutboxRepository } from './repositories/MailOutbox.repository';

function transportFor(env: Env): MailTransport {
  switch (env.MAIL_DRIVER) {
    case 'smtp':
      return new SmtpMailTransport(env);
    case 'memory':
      return new MemoryMailTransport();
    case 'log':
      return new LogMailTransport();
  }
}

@Module({
  providers: [
    { provide: MAIL_TRANSPORT, useFactory: transportFor, inject: [ENV] },
    MailerService,
    MailOutboxRepository,
  ],
  exports: [MailerService, MailOutboxRepository, MAIL_TRANSPORT],
})
export class MailSharedModule {}
