import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { invalidToken, tokenExpired } from '@/common/errors/auth-errors';
import type { Env } from '@/config/env.schema';
import { ENV } from '@/config/env.token';
import type { AuthPrincipal } from './auth-principal';

const DAY_MS = 24 * 60 * 60 * 1000;
const SECONDS_PER_MINUTE = 60;
const OPAQUE_TOKEN_BYTES = 32;

type TokenType = 'access' | 'two_factor';

interface AccessClaims {
  sub: string;
  sid: string;
  typ: 'access';
}

interface ChallengeClaims {
  sub: string;
  typ: 'two_factor';
}

export interface OpaqueToken {
  token: string;
  hash: string;
}

function isExpiry(error: unknown): boolean {
  return error instanceof Error && error.name === 'TokenExpiredError';
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  signAccessToken({ userId, sessionId }: AuthPrincipal): Promise<string> {
    const claims: AccessClaims = { sub: userId, sid: sessionId, typ: 'access' };
    const ttl = this.env.JWT_ACCESS_TTL_MINUTES;
    return this.sign(claims, ttl === null ? null : ttl * SECONDS_PER_MINUTE);
  }

  async verifyAccessToken(token: string): Promise<AuthPrincipal> {
    const claims = await this.verify<AccessClaims>(token, 'access');
    return { userId: claims.sub, sessionId: claims.sid };
  }

  signTwoFactorChallenge(userId: string): Promise<string> {
    const claims: ChallengeClaims = { sub: userId, typ: 'two_factor' };
    return this.sign(claims, this.env.TWO_FACTOR_CHALLENGE_TTL_SECONDS);
  }

  async verifyTwoFactorChallenge(token: string): Promise<{ userId: string }> {
    const claims = await this.verify<ChallengeClaims>(token, 'two_factor');
    return { userId: claims.sub };
  }

  /** Refresh, verification and reset tokens: random, shown once, stored only as a sha256 hash. */
  createOpaqueToken(): OpaqueToken {
    const token = randomBytes(OPAQUE_TOKEN_BYTES).toString('base64url');
    return { token, hash: this.hashOpaqueToken(token) };
  }

  hashOpaqueToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  refreshTokenExpiry(now: Date = new Date()): Date {
    return new Date(now.getTime() + this.env.REFRESH_TOKEN_TTL_DAYS * DAY_MS);
  }

  /**
   * A null lifetime omits `expiresIn`, so the token carries `iat` and no `exp` and never expires on its own. The
   * session lookup in AccessTokenGuard is what bounds and revokes it.
   */
  private sign(claims: object, expiresInSeconds: number | null): Promise<string> {
    return this.jwt.signAsync(claims, {
      secret: this.env.JWT_SECRET,
      ...(expiresInSeconds === null ? {} : { expiresIn: expiresInSeconds }),
    });
  }

  /** Verifies signature and expiry, then the `typ` claim so access and challenge tokens cannot be swapped. */
  private async verify<T extends { typ: TokenType }>(token: string, expected: TokenType): Promise<T> {
    let claims: T;
    try {
      claims = await this.jwt.verifyAsync<T>(token, {
        secret: this.env.JWT_SECRET,
      });
    } catch (error) {
      throw isExpiry(error) ? tokenExpired() : invalidToken();
    }
    if (claims.typ !== expected) throw invalidToken();
    return claims;
  }
}
