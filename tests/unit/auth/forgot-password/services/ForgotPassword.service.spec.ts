import { memoryMailer, securityServices } from '@tests/setup/security.fixture';
import { USER_ID } from '@tests/setup/user.fixture';
import { ForgotPasswordRepository } from '@/auth/forgot-password/repositories/ForgotPassword.repository';
import { ForgotPasswordService } from '@/auth/forgot-password/services/ForgotPassword.service';
import { firstArg } from '@tests/setup/mock-calls';
import { UserRepository } from '@/auth/shared/repositories/User.repository';
import { mailMessageSchema } from '@/mail/mail-message.schema';

const { env, tokens, cipher } = securityServices();

function build() {
  const repository = {
    replaceResetToken: jest.fn().mockResolvedValue(undefined),
  };
  const users = { findByEmail: jest.fn().mockResolvedValue(null) };
  const { transport, mailer } = memoryMailer();
  const service = new ForgotPasswordService(
    repository as unknown as ForgotPasswordRepository,
    users as unknown as UserRepository,
    tokens,
    mailer,
    cipher,
    env,
  );
  return { repository, users, transport, service };
}

describe('ForgotPasswordService', () => {
  it('stores an expiring hashed token with encrypted mail, without sending inside the request', async () => {
    const { repository, users, transport, service } = build();
    users.findByEmail.mockResolvedValue({ id: USER_ID });

    await service.handle({ email: 'ada@example.com' });

    const stored = firstArg<{
      userId: string;
      tokenHash: string;
      expiresAt: Date;
      encryptedPayload: string;
    }>(repository.replaceResetToken);
    const message = mailMessageSchema.parse(JSON.parse(cipher.decrypt(stored.encryptedPayload)));
    const link = message.text.match(/token=([^\s]+)/)?.[1] ?? '';
    expect(message.subject).toMatch(/reset/i);
    expect(transport.sent).toHaveLength(0);
    expect(tokens.hashOpaqueToken(decodeURIComponent(link))).toBe(stored.tokenHash);
    expect(stored.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(env.PASSWORD_RESET_TTL_MINUTES * 60_000);
  });

  it('stays silent for unknown emails', async () => {
    const { repository, transport, service } = build();

    await expect(service.handle({ email: 'nobody@example.com' })).resolves.toBeUndefined();

    expect(repository.replaceResetToken).not.toHaveBeenCalled();
    expect(transport.sent).toHaveLength(0);
  });
});
