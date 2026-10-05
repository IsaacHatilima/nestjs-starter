import { Env } from '@/config/env.schema';
import { MailerService } from '@/mail/mailer.service';
import { MemoryMailTransport } from '@/mail/transports/memory.transport';

const env = {
  APP_NAME: 'ZITD',
  APP_URL: 'http://localhost:3001',
  MAIL_FROM: 'ZITD <no-reply@zitd.local>',
} as Env;

describe('MailerService', () => {
  let transport: MemoryMailTransport;
  let mailer: MailerService;

  beforeEach(() => {
    transport = new MemoryMailTransport();
    mailer = new MailerService(transport, env);
  });

  it('sends a verification email that links to the dashboard with the token', async () => {
    await mailer.send(mailer.emailVerificationMessage('ada@example.com', 'tok-123'));

    expect(transport.sent).toHaveLength(1);
    const [message] = transport.sent;
    expect(message.to).toBe('ada@example.com');
    expect(message.from).toBe('ZITD <no-reply@zitd.local>');
    expect(message.subject).toMatch(/verify/i);
    expect(message.text).toContain('http://localhost:3001/verify-email?token=tok-123');
    expect(message.html).toContain('http://localhost:3001/verify-email?token=tok-123');
  });

  it('sends a password reset email that links to the dashboard with the token', async () => {
    await mailer.send(mailer.passwordResetMessage('ada@example.com', 'tok-456'));

    const [message] = transport.sent;
    expect(message.subject).toMatch(/reset/i);
    expect(message.text).toContain('http://localhost:3001/reset-password?token=tok-456');
  });

  it('url-encodes tokens inside links', async () => {
    await mailer.send(mailer.emailVerificationMessage('ada@example.com', 'a b&c'));

    expect(transport.sent[0].text).toContain('token=a%20b%26c');
  });

  it('lets the memory transport be cleared between tests', async () => {
    await mailer.send(mailer.emailVerificationMessage('ada@example.com', 'x'));
    transport.clear();

    expect(transport.sent).toHaveLength(0);
  });
});
