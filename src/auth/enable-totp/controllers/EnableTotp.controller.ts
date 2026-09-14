import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CREDENTIAL_THROTTLE } from '@/common/throttle';
import type { AuthPrincipal } from '@/security/auth-principal';
import { CurrentAuth } from '@/security/decorators/current-auth.decorator';
import { EnableTotpDto } from '@/auth/enable-totp/dto/EnableTotp.dto';
import { EnableTotpService } from '@/auth/enable-totp/services/EnableTotp.service';
import type { TwoFactorRecoveryCodes } from '@/auth/shared/types/TwoFactorRecoveryCodes.types';

/**
 * POST /auth/enable-totp: confirm enrolment and receive recovery codes. Validation, throttling and auth are
 * declarative; the service does the work.
 */
@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class EnableTotpController {
  constructor(private readonly service: EnableTotpService) {}

  @Throttle(CREDENTIAL_THROTTLE)
  @Post('enable-totp')
  @HttpCode(200)
  handle(@CurrentAuth() auth: AuthPrincipal, @Body() body: EnableTotpDto): Promise<TwoFactorRecoveryCodes> {
    return this.service.handle(auth, body);
  }
}
