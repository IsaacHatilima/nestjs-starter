import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthPrincipal } from '@/security/auth-principal';
import type { AuthenticatedRequest } from '@/security/authenticated-request';

/** Injects the {@link AuthPrincipal} attached by the access token guard. */
export const CurrentAuth = createParamDecorator((_data: unknown, context: ExecutionContext): AuthPrincipal => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!request.auth) throw new Error('CurrentAuth used on a public route');
  return request.auth;
});
