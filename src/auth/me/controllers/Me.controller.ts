import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopeResponse } from '@/common/openapi/api-envelope-response.decorator';
import { ErrorCode } from '@/common/errors/error-codes';
import { UserSchema } from '@/auth/shared/schemas/User.schema';
import type { AuthPrincipal } from '@/security/auth-principal';
import { CurrentAuth } from '@/security/decorators/current-auth.decorator';
import { MeService } from '@/auth/me/services/Me.service';
import type { User } from '@/auth/shared/types/User.types';

/** GET /auth/me: the signed-in user. Validation, throttling and auth are declarative; the service does the work. */
@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class MeController {
  constructor(private readonly service: MeService) {}

  @Get('me')
  @ApiEnvelopeResponse({ data: UserSchema, bearer: true, errors: [ErrorCode.NOT_FOUND] })
  handle(@CurrentAuth() auth: AuthPrincipal): Promise<User> {
    return this.service.handle(auth);
  }
}
