import { ErrorCode } from '@/common/errors/error-codes';
import { securityServices } from '@tests/setup/security.fixture';
import { ResetPasswordRepository } from '@/auth/reset-password/repositories/ResetPassword.repository';
import type { PasswordBlocklist } from '@/security/password-blocklist.service';
import { ResetPasswordService } from '@/auth/reset-password/services/ResetPassword.service';

const { tokens, hasher } = securityServices();

function build(reset: boolean, verdict: { blocked: boolean; reason?: string } = { blocked: false }) {
  const repository = { resetWithToken: jest.fn().mockResolvedValue(reset) };
  const blocklist = { check: jest.fn().mockResolvedValue(verdict) };
  return {
    repository,
    service: new ResetPasswordService(
      repository as unknown as ResetPasswordRepository,
      tokens,
      hasher,
      blocklist as unknown as PasswordBlocklist,
    ),
  };
}

describe('ResetPasswordService', () => {
  it('stores a new argon2 hash against the token hash', async () => {
    const { repository, service } = build(true);
    const { token, hash } = tokens.createOpaqueToken();

    await service.handle({ token, password: 'brand new password' });

    const [tokenHash, passwordHash] = repository.resetWithToken.mock.calls[0] as [string, string];
    expect(tokenHash).toBe(hash);
    await expect(hasher.verify(passwordHash, 'brand new password')).resolves.toBe(true);
  });

  it('rejects an unknown, used or expired token', async () => {
    const { service } = build(false);

    await expect(service.handle({ token: 'nope', password: 'brand new password' })).rejects.toMatchObject({
      code: ErrorCode.INVALID_TOKEN,
    });
  });

  it('refuses a compromised password and leaves the old one in place', async () => {
    const { repository, service } = build(true, { blocked: true, reason: 'common' });

    await expect(service.handle({ token: 'tok', password: 'brand new password' })).rejects.toMatchObject({
      code: ErrorCode.PASSWORD_COMPROMISED,
    });
    expect(repository.resetWithToken).not.toHaveBeenCalled();
  });
});
