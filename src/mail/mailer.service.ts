import { Inject, Injectable } from '@nestjs/common';
import type { Env } from '@/config/env.schema';
import { ENV } from '@/config/env.token';
import { MAIL_TRANSPORT, type MailTransport } from './mail.transport';
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

  sendEmailVerification(to: string, token: string): Promise<void> {
    const link = this.dashboardLink(VERIFY_EMAIL_PATH, token);
    return this.deliver(to, emailVerificationTemplate(this.env.APP_NAME, link));
  }

  sendPasswordReset(to: string, token: string): Promise<void> {
    const link = this.dashboardLink(RESET_PASSWORD_PATH, token);
    return this.deliver(to, passwordResetTemplate(this.env.APP_NAME, link));
  }

  // Links point at the dashboard, which calls the matching API route with the token.
  private dashboardLink(path: string, token: string): string {
    return `${this.env.APP_URL}${path}?token=${encodeURIComponent(token)}`;
  }

  private deliver(to: string, content: MailContent): Promise<void> {
    return this.transport.send({ from: this.env.MAIL_FROM, to, ...content });
  }
}
