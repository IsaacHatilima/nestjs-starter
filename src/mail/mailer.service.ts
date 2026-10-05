import { Inject, Injectable } from '@nestjs/common';
import type { Env } from '@/config/env.schema';
import { ENV } from '@/config/env.token';
import { MAIL_TRANSPORT, type MailMessage, type MailTransport } from './mail.transport';
import { emailVerificationTemplate } from './templates/email-verification.template';
import type { MailContent } from './templates/mail-template';
import { passwordResetTemplate } from './templates/password-reset.template';

const VERIFY_EMAIL_PATH = '/verify-email';
const RESET_PASSWORD_PATH = '/reset-password';

@Injectable()
export class MailerService {
  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
    @Inject(ENV) private readonly env: Env,
  ) {}

  emailVerificationMessage(to: string, token: string): MailMessage {
    const link = this.dashboardLink(VERIFY_EMAIL_PATH, token);
    return this.message(to, emailVerificationTemplate(this.env.APP_NAME, link));
  }

  passwordResetMessage(to: string, token: string): MailMessage {
    const link = this.dashboardLink(RESET_PASSWORD_PATH, token);
    return this.message(to, passwordResetTemplate(this.env.APP_NAME, link));
  }

  send(message: MailMessage): Promise<void> {
    return this.transport.send(message);
  }

  // Links point at the dashboard, which calls the matching API route with the token.
  private dashboardLink(path: string, token: string): string {
    return `${this.env.APP_URL}${path}?token=${encodeURIComponent(token)}`;
  }

  private message(to: string, content: MailContent): MailMessage {
    return { from: this.env.MAIL_FROM, to, ...content };
  }
}
