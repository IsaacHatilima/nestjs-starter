import { createTransport } from 'nodemailer';
import type { Env } from '@/config/env.schema';
import { SmtpMailTransport } from '@/mail/transports/smtp.transport';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

const sendMail = jest.fn().mockResolvedValue(undefined);
const createTransportMock = jest.mocked(createTransport);

const env = {
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: 2525,
  SMTP_SECURE: true,
  SMTP_USER: 'mailer',
  SMTP_PASS: 'hunter2',
} as Env;

describe('SmtpMailTransport', () => {
  beforeEach(() => {
    createTransportMock.mockReset();
    createTransportMock.mockReturnValue({ sendMail } as never);
    sendMail.mockClear();
  });

  it('configures nodemailer from the environment and delivers messages', async () => {
    const transport = new SmtpMailTransport(env);
    const message = {
      from: 'ZITD <no-reply@zitd.local>',
      to: 'ada@example.com',
      subject: 'Hi',
      text: 'hi',
      html: '<p>hi</p>',
    };

    await transport.send(message);

    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 2525,
      secure: true,
      auth: { user: 'mailer', pass: 'hunter2' },
    });
    expect(sendMail).toHaveBeenCalledWith(message);
  });

  it('omits auth when no SMTP user is configured', () => {
    new SmtpMailTransport({
      ...env,
      SMTP_USER: undefined,
      SMTP_PASS: undefined,
    });

    expect(createTransportMock).toHaveBeenCalledWith(expect.objectContaining({ auth: undefined }));
  });
});
