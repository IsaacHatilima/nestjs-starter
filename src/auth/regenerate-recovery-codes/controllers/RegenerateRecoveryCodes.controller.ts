import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiEnvelopeResponse } from '@/common/openapi/api-envelope-response.decorator';
import { ErrorCode } from '@/common/errors/error-codes';
import { TwoFactorRecoveryCodesSchema } from '@/auth/shared/schemas/TwoFactorRecoveryCodes.schema';
import { CREDENTIAL_THROTTLE } from '@/common/throttle';
import type { AuthPrincipal } from '@/security/auth-principal';
import { CurrentAuth } from '@/security/decorators/current-auth.decorator';
import { RegenerateRecoveryCodesDto } from '@/auth/regenerate-recovery-codes/dto/RegenerateRecoveryCodes.dto';
import { RegenerateRecoveryCodesService } from '@/auth/regenerate-recovery-codes/services/RegenerateRecoveryCodes.service';
import type { TwoFactorRecoveryCodes } from '@/auth/shared/types/TwoFactorRecoveryCodes.types';

/**
 * POST /auth/regenerate-recovery-codes: replace the recovery codes. Validation, throttling and auth are declarative;
 * the service does the work.
 */
@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class RegenerateRecoveryCodesController {
  constructor(private readonly service: RegenerateRecoveryCodesService) {}

  @Throttle(CREDENTIAL_THROTTLE)
  @Post('regenerate-recovery-codes')
  @HttpCode(200)
  @ApiEnvelopeResponse({
    data: TwoFactorRecoveryCodesSchema,
    bearer: true,
    validation: true,
    errors: [
      ErrorCode.TWO_FACTOR_NOT_ENABLED,
      ErrorCode.INVALID_CREDENTIALS,
      ErrorCode.INVALID_TWO_FACTOR_CODE,
      ErrorCode.NOT_FOUND,
    ],
  })
  handle(
    @CurrentAuth() auth: AuthPrincipal,
    @Body() body: RegenerateRecoveryCodesDto,
  ): Promise<TwoFactorRecoveryCodes> {
    return this.service.handle(auth, body);
  }
}
