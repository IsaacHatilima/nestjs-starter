import type { MailMessage } from './mail-message.schema';

export type { MailMessage } from './mail-message.schema';

export interface MailTransport {
  send(message: MailMessage): Promise<void>;
}

export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');
