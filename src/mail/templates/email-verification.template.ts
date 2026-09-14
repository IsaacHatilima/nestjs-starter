import { type MailContent, renderMail } from './mail-template';

export function emailVerificationTemplate(appName: string, link: string): MailContent {
  return renderMail({
    subject: `Verify your ${appName} email address`,
    intro: [`Welcome to ${appName}!`, 'Confirm your email address by opening this link:'],
    link,
    outro: ['If you did not create an account, you can ignore this email.'],
  });
}
