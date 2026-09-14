import { type MailContent, renderMail } from './mail-template';

export function passwordResetTemplate(appName: string, link: string): MailContent {
  return renderMail({
    subject: `Reset your ${appName} password`,
    intro: [`We received a request to reset your ${appName} password.`, 'Choose a new password by opening this link:'],
    link,
    outro: ['If you did not request a reset, you can ignore this email; your password will not change.'],
  });
}
