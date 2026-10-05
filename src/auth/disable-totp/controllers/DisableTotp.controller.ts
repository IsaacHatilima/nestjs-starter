import { z } from 'zod';
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiEnvelopeResponse } from '@/common/openapi/api-envelope-response.decorator';
import { ErrorCode } from '@/common/errors/error-codes';
import { CREDENTIAL_THROTTLE } from '@/common/throttle';
import type { AuthPrincipal } from '@/security/auth-principal';
import { CurrentAuth } from '@/security/decorators/current-auth.decorator';
import { DisableTotpDto } from '@/auth/disable-totp/dto/DisableTotp.dto';
import { DisableTotpService } from '@/auth/disable-totp/services/DisableTotp.service';

/**
 * POST /auth/disable-totp: turn two-factor off. Validation, throttling and auth are declarative; the service does the
 * work.
 */
@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class DisableTotpController {
  constructor(private readonly service: DisableTotpService) {}

  @Throttle(CREDENTIAL_THROTTLE)
  @Post('disable-totp')
  @HttpCode(200)
  @ApiEnvelopeResponse({
    data: z.null(),
    bearer: true,
    validation: true,
    errors: [
      ErrorCode.TWO_FACTOR_NOT_ENABLED,
      ErrorCode.INVALID_CREDENTIALS,
      ErrorCode.INVALID_TWO_FACTOR_CODE,
      ErrorCode.NOT_FOUND,
    ],
  })
  handle(@CurrentAuth() auth: AuthPrincipal, @Body() body: DisableTotpDto): Promise<void> {
    return this.service.handle(auth, body);
  }
}
