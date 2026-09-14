import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CREDENTIAL_THROTTLE } from '@/common/throttle';
import { Public } from '@/security/decorators/public.decorator';
import { VerifyEmailDto } from '@/auth/verify-email/dto/VerifyEmail.dto';
import { VerifyEmailService } from '@/auth/verify-email/services/VerifyEmail.service';

/**
 * POST /auth/verify-email: consume an emailed verification token. Validation, throttling and auth are declarative; the
 * service does the work.
 */
@ApiTags('auth')
@Controller('auth')
export class VerifyEmailController {
  constructor(private readonly service: VerifyEmailService) {}

  @Public()
  @Throttle(CREDENTIAL_THROTTLE)
  @Post('verify-email')
  @HttpCode(204)
  handle(@Body() body: VerifyEmailDto): Promise<void> {
    return this.service.handle(body);
  }
}
