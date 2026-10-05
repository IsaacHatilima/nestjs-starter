import { z } from 'zod';
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiEnvelopeResponse } from '@/common/openapi/api-envelope-response.decorator';
import { ErrorCode } from '@/common/errors/error-codes';
import { CREDENTIAL_THROTTLE } from '@/common/throttle';
import { Public } from '@/security/decorators/public.decorator';
import { ResetPasswordDto } from '@/auth/reset-password/dto/ResetPassword.dto';
import { ResetPasswordService } from '@/auth/reset-password/services/ResetPassword.service';

/**
 * POST /auth/reset-password: set a new password from a reset token. Validation, throttling and auth are declarative;
 * the service does the work.
 */
@ApiTags('auth')
@Controller('auth')
export class ResetPasswordController {
  constructor(private readonly service: ResetPasswordService) {}

  @Public()
  @Throttle(CREDENTIAL_THROTTLE)
  @Post('reset-password')
  @HttpCode(200)
  @ApiEnvelopeResponse({
    data: z.null(),
    validation: true,
    errors: [ErrorCode.INVALID_TOKEN, ErrorCode.PASSWORD_COMPROMISED],
  })
  handle(@Body() body: ResetPasswordDto): Promise<void> {
    return this.service.handle(body);
  }
}
