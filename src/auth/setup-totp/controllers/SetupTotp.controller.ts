import { Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopeResponse } from '@/common/openapi/api-envelope-response.decorator';
import { ErrorCode } from '@/common/errors/error-codes';
import { TwoFactorSetupSchema } from '@/auth/setup-totp/schemas/TwoFactorSetup.schema';
import type { AuthPrincipal } from '@/security/auth-principal';
import { CurrentAuth } from '@/security/decorators/current-auth.decorator';
import { SetupTotpService } from '@/auth/setup-totp/services/SetupTotp.service';
import type { TwoFactorSetup } from '@/auth/setup-totp/types/TwoFactorSetup.types';

/**
 * POST /auth/setup-totp: start two-factor enrolment. Validation, throttling and auth are declarative; the service does
 * the work.
 */
@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class SetupTotpController {
  constructor(private readonly service: SetupTotpService) {}

  @Post('setup-totp')
  @HttpCode(200)
  @ApiEnvelopeResponse({
    data: TwoFactorSetupSchema,
    bearer: true,
    errors: [ErrorCode.TWO_FACTOR_ALREADY_ENABLED, ErrorCode.NOT_FOUND],
  })
  handle(@CurrentAuth() auth: AuthPrincipal): Promise<TwoFactorSetup> {
    return this.service.handle(auth);
  }
}
