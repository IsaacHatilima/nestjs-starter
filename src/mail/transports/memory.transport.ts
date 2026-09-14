import type { MailMessage, MailTransport } from '@/mail/mail.transport';

/** Keeps sent mail in memory so tests can read tokens out of it. */
export class MemoryMailTransport implements MailTransport {
  private messages: readonly MailMessage[] = [];

  get sent(): readonly MailMessage[] {
    return this.messages;
  }

  send(message: MailMessage): Promise<void> {
    this.messages = [...this.messages, message];
    return Promise.resolve();
  }

  last(): MailMessage | undefined {
    return this.messages[this.messages.length - 1];
  }

  clear(): void {
    this.messages = [];
  }
}
