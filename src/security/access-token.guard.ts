import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { invalidToken, sessionRevoked } from '@/common/errors/auth-errors';
import { ActiveSessionRepository } from './active-session.repository';
import type { AuthenticatedRequest } from './authenticated-request';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { TokenService } from './token.service';

const BEARER_PREFIX = /^Bearer\s+(.+)$/i;

function bearerTokenOf(header: string | undefined): string | null {
  const match = header?.match(BEARER_PREFIX);
  return match ? match[1].trim() : null;
}

/**
 * Global guard: every route needs a valid access token whose session is still
 * active, unless the handler or controller is marked with `@Public()`.
 */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly sessions: ActiveSessionRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = bearerTokenOf(request.headers.authorization);
    if (!token) throw invalidToken('Missing bearer token');

    const principal = await this.tokens.verifyAccessToken(token);
    // One query per request buys immediate revocation: logout, reset and revoke apply at once.
    const session = await this.sessions.findActive(principal.sessionId);
    if (!session) throw sessionRevoked();

    request.auth = principal;
    return true;
  }
}
