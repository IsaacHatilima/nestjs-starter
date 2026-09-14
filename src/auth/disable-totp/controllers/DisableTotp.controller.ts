import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
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
  @HttpCode(204)
  handle(@CurrentAuth() auth: AuthPrincipal, @Body() body: DisableTotpDto): Promise<void> {
    return this.service.handle(auth, body);
  }
}
