import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CREDENTIAL_THROTTLE } from '@/common/throttle';
import { Public } from '@/security/decorators/public.decorator';
import { RequestMeta } from '@/security/decorators/request-meta.decorator';
import type { RequestMeta as RequestMetaShape } from '@/security/request-meta';
import { VerifyTwoFactorDto } from '@/auth/verify-two-factor/dto/VerifyTwoFactor.dto';
import { VerifyTwoFactorService } from '@/auth/verify-two-factor/services/VerifyTwoFactor.service';
import type { AuthenticatedResult } from '@/auth/shared/types/AuthResult.types';

/**
 * POST /auth/verify-two-factor: second step of login with a TOTP or recovery code. Validation, throttling and auth are
 * declarative; the service does the work.
 */
@ApiTags('auth')
@Controller('auth')
export class VerifyTwoFactorController {
  constructor(private readonly service: VerifyTwoFactorService) {}

  @Public()
  @Throttle(CREDENTIAL_THROTTLE)
  @Post('verify-two-factor')
  @HttpCode(200)
  handle(@Body() body: VerifyTwoFactorDto, @RequestMeta() meta: RequestMetaShape): Promise<AuthenticatedResult> {
    return this.service.handle(body, meta);
  }
}
