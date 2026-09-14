import { securityServices } from '@tests/setup/security.fixture';
import { LogoutRepository } from '@/auth/logout/repositories/Logout.repository';
import { LogoutService } from '@/auth/logout/services/Logout.service';

const { tokens } = securityServices();

describe('LogoutService', () => {
  it('revokes the session that owns the refresh token, by hash', async () => {
    const repository = {
      revokeByRefreshTokenHash: jest.fn().mockResolvedValue(undefined),
    };
    const service = new LogoutService(repository as unknown as LogoutRepository, tokens);
    const { token, hash } = tokens.createOpaqueToken();

    await expect(service.handle({ refreshToken: token })).resolves.toBeUndefined();

    expect(repository.revokeByRefreshTokenHash).toHaveBeenCalledWith(hash);
  });
});
