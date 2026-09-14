import { memoryMailer, securityServices } from '@tests/setup/security.fixture';
import { USER_ID } from '@tests/setup/user.fixture';
import { ForgotPasswordRepository } from '@/auth/forgot-password/repositories/ForgotPassword.repository';
import { ForgotPasswordService } from '@/auth/forgot-password/services/ForgotPassword.service';
import { firstArg } from '@tests/setup/mock-calls';

const { env, tokens } = securityServices();

function build() {
  const repository = {
    findByEmail: jest.fn().mockResolvedValue(null),
    replaceResetToken: jest.fn().mockResolvedValue(undefined),
  };
  const { transport, mailer } = memoryMailer();
  const service = new ForgotPasswordService(repository as unknown as ForgotPasswordRepository, tokens, mailer, env);
  return { repository, transport, service };
}

describe('ForgotPasswordService', () => {
  it('stores a hashed reset token that expires and emails the plain token', async () => {
    const { repository, transport, service } = build();
    repository.findByEmail.mockResolvedValue({ id: USER_ID });

    await service.handle({ email: 'ada@example.com' });

    const stored = firstArg<{
      userId: string;
      tokenHash: string;
      expiresAt: Date;
    }>(repository.replaceResetToken);
    const link = transport.last()?.text.match(/token=([^\s]+)/)?.[1] ?? '';
    expect(transport.last()?.subject).toMatch(/reset/i);
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
