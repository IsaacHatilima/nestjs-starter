import { z } from 'zod';
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiEnvelopeResponse } from '@/common/openapi/api-envelope-response.decorator';
import { ErrorCode } from '@/common/errors/error-codes';
import { CREDENTIAL_THROTTLE } from '@/common/throttle';
import type { AuthPrincipal } from '@/security/auth-principal';
import { CurrentAuth } from '@/security/decorators/current-auth.decorator';
import { ChangePasswordDto } from '@/auth/change-password/dto/ChangePassword.dto';
import { ChangePasswordService } from '@/auth/change-password/services/ChangePassword.service';

/** POST /auth/change-password: change the password of the signed-in user.
 * Validation, throttling and auth are declarative; the service does the work. */
@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class ChangePasswordController {
  constructor(private readonly service: ChangePasswordService) {}

  @Throttle(CREDENTIAL_THROTTLE)
  @Post('change-password')
  @HttpCode(200)
  @ApiEnvelopeResponse({
    data: z.null(),
    bearer: true,
    validation: true,
    errors: [ErrorCode.INVALID_CREDENTIALS, ErrorCode.PASSWORD_COMPROMISED],
  })
  handle(@CurrentAuth() auth: AuthPrincipal, @Body() body: ChangePasswordDto): Promise<void> {
    return this.service.handle(auth, body);
  }
}
