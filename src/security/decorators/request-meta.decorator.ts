import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { RequestMeta as RequestMetaShape } from '@/security/request-meta';

/** Injects the caller's IP address and user agent for session records. */
export const RequestMeta = createParamDecorator((_data: unknown, context: ExecutionContext): RequestMetaShape => {
  const request = context.switchToHttp().getRequest<Request>();
  const userAgent = request.headers['user-agent'];
  return {
    ip: request.ip ?? null,
    userAgent: typeof userAgent === 'string' ? userAgent : null,
  };
});
