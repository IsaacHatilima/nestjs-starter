import type { RequestMeta } from '@/security/request-meta';
import { TokenService } from '@/security/token.service';
import type { SessionInput, TokenPair } from '@/auth/shared/types/AuthResult.types';

/** The one repository method session issuance needs. */
export interface SessionCreator {
  create(input: SessionInput): Promise<{ id: string }>;
}

/**
 * Creates a session row holding the hashed refresh token, then signs an
 * access token bound to that session. Shared by login and two-factor login.
 */
export async function issueSession(
  tokens: TokenService,
  store: SessionCreator,
  userId: string,
  meta: RequestMeta,
): Promise<TokenPair> {
  // The refresh token is created first because its hash is part of the session row.
  const refresh = tokens.createOpaqueToken();
  const session = await store.create({
    userId,
    refreshTokenHash: refresh.hash,
    expiresAt: tokens.refreshTokenExpiry(),
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  // The access token carries the session id, which the guard checks on every request.
  const accessToken = await tokens.signAccessToken({
    userId,
    sessionId: session.id,
  });
  return { accessToken, refreshToken: refresh.token };
}
