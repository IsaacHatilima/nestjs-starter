import { Global, Module } from '@nestjs/common';
import type { Env } from '@/config/env.schema';
import { ENV } from '@/config/env.token';
import { MAIL_TRANSPORT, type MailTransport } from './mail.transport';
import { MailerService } from './mailer.service';
import { LogMailTransport } from './transports/log.transport';
import { MemoryMailTransport } from './transports/memory.transport';
import { SmtpMailTransport } from './transports/smtp.transport';

// The driver is chosen once at startup; production is limited to smtp by the env schema.
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

@Global()
@Module({
  providers: [{ provide: MAIL_TRANSPORT, useFactory: transportFor, inject: [ENV] }, MailerService],
  exports: [MailerService, MAIL_TRANSPORT],
})
export class MailModule {}
