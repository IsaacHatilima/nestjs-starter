import { Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthPrincipal } from '@/security/auth-principal';
import { CurrentAuth } from '@/security/decorators/current-auth.decorator';
import { RevokeOtherSessionsService } from '@/auth/revoke-other-sessions/services/RevokeOtherSessions.service';

/**
 * POST /auth/revoke-other-sessions: sign out everywhere else. Validation, throttling and auth are declarative; the
 * service does the work.
 */
@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class RevokeOtherSessionsController {
  constructor(private readonly service: RevokeOtherSessionsService) {}

  @Post('revoke-other-sessions')
  @HttpCode(204)
  handle(@CurrentAuth() auth: AuthPrincipal): Promise<void> {
    return this.service.handle(auth);
  }
}
