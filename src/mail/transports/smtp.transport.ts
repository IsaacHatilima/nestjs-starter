import { createTransport, Transporter } from 'nodemailer';
import type { Env } from '@/config/env.schema';
import type { MailMessage, MailTransport } from '@/mail/mail.transport';

export class SmtpMailTransport implements MailTransport {
  private readonly transporter: Transporter;

  constructor(env: Env) {
    this.transporter = createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? '' } : undefined,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 60_000,
    });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail(message);
  }
}
