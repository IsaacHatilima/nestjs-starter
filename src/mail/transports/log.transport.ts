import { Logger } from '@nestjs/common';
import type { MailMessage, MailTransport } from '@/mail/mail.transport';

/** Development transport: prints the message (including links) to the log. */
export class LogMailTransport implements MailTransport {
  private readonly logger = new Logger('Mail');

  send(message: MailMessage): Promise<void> {
    this.logger.log(`To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}`);
    return Promise.resolve();
  }
}
