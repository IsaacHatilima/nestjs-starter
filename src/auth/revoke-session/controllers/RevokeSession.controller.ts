import { z } from 'zod';
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopeResponse } from '@/common/openapi/api-envelope-response.decorator';
import { ErrorCode } from '@/common/errors/error-codes';
import type { AuthPrincipal } from '@/security/auth-principal';
import { CurrentAuth } from '@/security/decorators/current-auth.decorator';
import { RevokeSessionDto } from '@/auth/revoke-session/dto/RevokeSession.dto';
import { RevokeSessionService } from '@/auth/revoke-session/services/RevokeSession.service';

/**
 * POST /auth/revoke-session: revoke one of your own sessions. Validation, throttling and auth are declarative; the
 * service does the work.
 */
@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class RevokeSessionController {
  constructor(private readonly service: RevokeSessionService) {}

  @Post('revoke-session')
  @HttpCode(200)
  @ApiEnvelopeResponse({ data: z.null(), bearer: true, validation: true, errors: [ErrorCode.NOT_FOUND] })
  handle(@CurrentAuth() auth: AuthPrincipal, @Body() body: RevokeSessionDto): Promise<void> {
    return this.service.handle(auth, body);
  }
}
