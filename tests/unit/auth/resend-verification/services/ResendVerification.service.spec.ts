import { memoryMailer, securityServices } from '@tests/setup/security.fixture';
import { NOW, USER_ID } from '@tests/setup/user.fixture';
import { ResendVerificationRepository } from '@/auth/resend-verification/repositories/ResendVerification.repository';
import { ResendVerificationService } from '@/auth/resend-verification/services/ResendVerification.service';
import { firstArg } from '@tests/setup/mock-calls';
import { UserRepository } from '@/auth/shared/repositories/User.repository';
import { mailMessageSchema } from '@/mail/mail-message.schema';

const { env, tokens, cipher } = securityServices();

function build() {
  const repository = {
    replaceVerificationToken: jest.fn().mockResolvedValue(undefined),
  };
  const users = { findByEmail: jest.fn().mockResolvedValue(null) };
  const { transport, mailer } = memoryMailer();
  const service = new ResendVerificationService(
    repository as unknown as ResendVerificationRepository,
    users as unknown as UserRepository,
    tokens,
    mailer,
    cipher,
    env,
  );
  return { repository, users, transport, service };
}

describe('ResendVerificationService', () => {
  it('replaces the pending token and queues an encrypted fresh link', async () => {
    const { repository, users, transport, service } = build();
    users.findByEmail.mockResolvedValue({
      id: USER_ID,
      emailVerifiedAt: null,
    });

    await service.handle({ email: 'ada@example.com' });

    const stored = firstArg<{
      userId: string;
      tokenHash: string;
      encryptedPayload: string;
    }>(repository.replaceVerificationToken);
    const message = mailMessageSchema.parse(JSON.parse(cipher.decrypt(stored.encryptedPayload)));
    const link = message.text.match(/token=([^\s]+)/)?.[1] ?? '';
    expect(transport.sent).toHaveLength(0);
    expect(stored.userId).toBe(USER_ID);
    expect(tokens.hashOpaqueToken(decodeURIComponent(link))).toBe(stored.tokenHash);
  });

  it('stays silent for unknown emails so accounts cannot be enumerated', async () => {
    const { repository, transport, service } = build();

    await expect(service.handle({ email: 'nobody@example.com' })).resolves.toBeUndefined();

    expect(repository.replaceVerificationToken).not.toHaveBeenCalled();
    expect(transport.sent).toHaveLength(0);
  });

  it('does nothing for an already verified email', async () => {
    const { users, transport, service } = build();
    users.findByEmail.mockResolvedValue({
      id: USER_ID,
      emailVerifiedAt: NOW,
    });

    await service.handle({ email: 'ada@example.com' });

    expect(transport.sent).toHaveLength(0);
  });
});
