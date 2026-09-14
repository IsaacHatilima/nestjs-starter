import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthPrincipal } from '@/security/auth-principal';
import { CurrentAuth } from '@/security/decorators/current-auth.decorator';
import { ListSessionsService } from '@/auth/list-sessions/services/ListSessions.service';
import type { Session } from '@/auth/list-sessions/types/Session.types';

/**
 * GET /auth/list-sessions: active sessions of the signed-in user. Validation, throttling and auth are declarative; the
 * service does the work.
 */
@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class ListSessionsController {
  constructor(private readonly service: ListSessionsService) {}

  @Get('list-sessions')
  handle(@CurrentAuth() auth: AuthPrincipal): Promise<Session[]> {
    return this.service.handle(auth);
  }
}
