import { Logger } from '@nestjs/common';
import { LogMailTransport } from '@/mail/transports/log.transport';

describe('LogMailTransport', () => {
  it('writes recipient, subject and body to the log', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    await new LogMailTransport().send({
      from: 'ZITD <no-reply@zitd.local>',
      to: 'ada@example.com',
      subject: 'Verify',
      text: 'open http://localhost:3001/verify-email?token=x',
      html: '<p>ignored</p>',
    });

    const [message] = log.mock.calls[0] as [string];
    expect(message).toContain('To: ada@example.com');
    expect(message).toContain('Subject: Verify');
    expect(message).toContain('token=x');
    log.mockRestore();
  });
});
