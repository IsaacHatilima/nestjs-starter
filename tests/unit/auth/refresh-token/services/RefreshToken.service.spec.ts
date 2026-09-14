import { ErrorCode } from '@/common/errors/error-codes';
import { securityServices } from '@tests/setup/security.fixture';
import { SESSION_ID, USER_ID } from '@tests/setup/user.fixture';
import { RefreshTokenRepository } from '@/auth/refresh-token/repositories/RefreshToken.repository';
import { RefreshTokenService } from '@/auth/refresh-token/services/RefreshToken.service';

const { tokens } = securityServices();

function build() {
  const repository = {
    findActiveByRefreshTokenHash: jest.fn().mockResolvedValue(null),
    findByPreviousRefreshTokenHash: jest.fn().mockResolvedValue(null),
    rotate: jest.fn().mockResolvedValue(undefined),
    revoke: jest.fn().mockResolvedValue(undefined),
  };
  const service = new RefreshTokenService(repository as unknown as RefreshTokenRepository, tokens);
  return { repository, service };
}

describe('RefreshTokenService', () => {
  it('rotates the refresh token and issues a new access token', async () => {
    const { repository, service } = build();
    const current = tokens.createOpaqueToken();
    repository.findActiveByRefreshTokenHash.mockResolvedValue({
      id: SESSION_ID,
      userId: USER_ID,
    });

    const pair = await service.handle({ refreshToken: current.token });

    expect(repository.findActiveByRefreshTokenHash).toHaveBeenCalledWith(current.hash);
    expect(pair.refreshToken).not.toBe(current.token);
    expect(repository.rotate).toHaveBeenCalledWith(SESSION_ID, {
      refreshTokenHash: tokens.hashOpaqueToken(pair.refreshToken),
      previousRefreshTokenHash: current.hash,
    });
    await expect(tokens.verifyAccessToken(pair.accessToken)).resolves.toEqual({
      userId: USER_ID,
      sessionId: SESSION_ID,
    });
  });

  it('revokes the whole session when a rotated-out token is replayed', async () => {
    const { repository, service } = build();
    const stale = tokens.createOpaqueToken();
    repository.findByPreviousRefreshTokenHash.mockResolvedValue({
      id: SESSION_ID,
    });

    await expect(service.handle({ refreshToken: stale.token })).rejects.toMatchObject({
      code: ErrorCode.SESSION_REVOKED,
    });
    expect(repository.revoke).toHaveBeenCalledWith(SESSION_ID);
    expect(repository.rotate).not.toHaveBeenCalled();
  });

  it('rejects an unknown refresh token', async () => {
    const { repository, service } = build();

    await expect(service.handle({ refreshToken: 'unknown' })).rejects.toMatchObject({
      code: ErrorCode.INVALID_TOKEN,
    });
    expect(repository.revoke).not.toHaveBeenCalled();
  });
});
