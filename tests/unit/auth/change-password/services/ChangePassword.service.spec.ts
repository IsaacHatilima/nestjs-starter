import { ErrorCode } from '@/common/errors/error-codes';
import { securityServices } from '@tests/setup/security.fixture';
import { SESSION_ID, USER_ID } from '@tests/setup/user.fixture';
import { ChangePasswordRepository } from '@/auth/change-password/repositories/ChangePassword.repository';
import type { PasswordBlocklist } from '@/security/password-blocklist.service';
import { ChangePasswordService } from '@/auth/change-password/services/ChangePassword.service';

const { hasher } = securityServices();
const auth = { userId: USER_ID, sessionId: SESSION_ID };

function build(currentHash: string | null, verdict: { blocked: boolean; reason?: string } = { blocked: false }) {
  const blocklist = { check: jest.fn().mockResolvedValue(verdict) };
  const repository = {
    findPasswordHash: jest.fn().mockResolvedValue(currentHash),
    changePassword: jest.fn().mockResolvedValue(undefined),
  };
  return {
    repository,
    blocklist,
    service: new ChangePasswordService(
      repository as unknown as ChangePasswordRepository,
      hasher,
      blocklist as unknown as PasswordBlocklist,
    ),
  };
}

describe('ChangePasswordService', () => {
  it('replaces the hash and signs out every other session in one step', async () => {
    const { repository, service } = build(await hasher.hash('old password!!'));

    await service.handle(auth, {
      currentPassword: 'old password!!',
      newPassword: 'new password!!!',
    });

    const [userId, newHash, keepSessionId] = repository.changePassword.mock.calls[0] as [string, string, string];
    expect(userId).toBe(USER_ID);
    expect(keepSessionId).toBe(SESSION_ID);
    await expect(hasher.verify(newHash, 'new password!!!')).resolves.toBe(true);
  });

  it('rejects a wrong current password', async () => {
    const { repository, service } = build(await hasher.hash('old password!!'));

    await expect(
      service.handle(auth, {
        currentPassword: 'wrong',
        newPassword: 'new password!!!',
      }),
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_CREDENTIALS });
    expect(repository.changePassword).not.toHaveBeenCalled();
  });

  it('refuses a compromised new password and keeps the current one', async () => {
    const { repository, service } = build(await hasher.hash('old password!!'), {
      blocked: true,
      reason: 'breached',
    });

    await expect(
      service.handle(auth, { currentPassword: 'old password!!', newPassword: 'new password!!!' }),
    ).rejects.toMatchObject({ code: ErrorCode.PASSWORD_COMPROMISED });
    expect(repository.changePassword).not.toHaveBeenCalled();
  });
});
