import { Injectable } from '@nestjs/common';
import { invalidToken, sessionRevoked } from '@/common/errors/auth-errors';
import { TokenService } from '@/security/token.service';
import { type ActiveSession, RefreshTokenRepository } from '@/auth/refresh-token/repositories/RefreshToken.repository';
import type { RefreshToken } from '@/auth/refresh-token/schemas/RefreshToken.schema';
import type { TokenPair } from '@/auth/shared/types/AuthResult.types';

/**
 * Rotates refresh tokens. A token that was already rotated away can only be
 * presented by someone who stole it, so the whole session is revoked.
 */
@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly repository: RefreshTokenRepository,
    private readonly tokens: TokenService,
  ) {}

  async handle(data: RefreshToken): Promise<TokenPair> {
    const hash = this.tokens.hashOpaqueToken(data.refreshToken);

    const session = await this.repository.findActiveByRefreshTokenHash(hash);
    if (session) return this.rotate(session, hash);

    // Not active: either unknown, or the previous token of a session that already rotated (theft).
    const reused = await this.repository.findByPreviousRefreshTokenHash(hash);
    if (reused) {
      await this.repository.revoke(reused.id);
      throw sessionRevoked();
    }
    throw invalidToken();
  }

  private async rotate(session: ActiveSession, previousHash: string): Promise<TokenPair> {
    const next = this.tokens.createOpaqueToken();
    await this.repository.rotate(session.id, {
      refreshTokenHash: next.hash,
      previousRefreshTokenHash: previousHash,
    });
    const accessToken = await this.tokens.signAccessToken({
      userId: session.userId,
      sessionId: session.id,
    });
    return { accessToken, refreshToken: next.token };
  }
}
