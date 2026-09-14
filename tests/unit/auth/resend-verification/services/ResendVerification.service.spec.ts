import { memoryMailer, securityServices } from '@tests/setup/security.fixture';
import { NOW, USER_ID } from '@tests/setup/user.fixture';
import { ResendVerificationRepository } from '@/auth/resend-verification/repositories/ResendVerification.repository';
import { ResendVerificationService } from '@/auth/resend-verification/services/ResendVerification.service';
import { firstArg } from '@tests/setup/mock-calls';

const { env, tokens } = securityServices();

function build() {
  const repository = {
    findByEmail: jest.fn().mockResolvedValue(null),
    replaceVerificationToken: jest.fn().mockResolvedValue(undefined),
  };
  const { transport, mailer } = memoryMailer();
  const service = new ResendVerificationService(
    repository as unknown as ResendVerificationRepository,
    tokens,
    mailer,
    env,
  );
  return { repository, transport, service };
}

describe('ResendVerificationService', () => {
  it('replaces the pending token and emails a fresh link', async () => {
    const { repository, transport, service } = build();
    repository.findByEmail.mockResolvedValue({
      id: USER_ID,
      emailVerifiedAt: null,
    });

    await service.handle({ email: 'ada@example.com' });

    const stored = firstArg<{
      userId: string;
      tokenHash: string;
    }>(repository.replaceVerificationToken);
    const link = transport.last()?.text.match(/token=([^\s]+)/)?.[1] ?? '';
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
    const { repository, transport, service } = build();
    repository.findByEmail.mockResolvedValue({
      id: USER_ID,
      emailVerifiedAt: NOW,
    });

    await service.handle({ email: 'ada@example.com' });

    expect(transport.sent).toHaveLength(0);
  });
});
