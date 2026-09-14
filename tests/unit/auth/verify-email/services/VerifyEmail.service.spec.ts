import { ErrorCode } from '@/common/errors/error-codes';
import { securityServices } from '@tests/setup/security.fixture';
import { VerifyEmailRepository } from '@/auth/verify-email/repositories/VerifyEmail.repository';
import { VerifyEmailService } from '@/auth/verify-email/services/VerifyEmail.service';

const { tokens } = securityServices();

function build(verified: boolean) {
  const repository = { verifyWithToken: jest.fn().mockResolvedValue(verified) };
  return {
    repository,
    service: new VerifyEmailService(repository as unknown as VerifyEmailRepository, tokens),
  };
}

describe('VerifyEmailService', () => {
  it('marks the email verified when the token hash matches an unused token', async () => {
    const { repository, service } = build(true);
    const { token, hash } = tokens.createOpaqueToken();

    await expect(service.handle({ token })).resolves.toBeUndefined();

    expect(repository.verifyWithToken).toHaveBeenCalledWith(hash);
  });

  it('rejects an unknown, used or expired token', async () => {
    const { service } = build(false);

    await expect(service.handle({ token: 'nope' })).rejects.toMatchObject({
      code: ErrorCode.INVALID_TOKEN,
    });
  });
});
