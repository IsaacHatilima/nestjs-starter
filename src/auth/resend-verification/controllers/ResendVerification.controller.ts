import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { EMAIL_THROTTLE } from '@/common/throttle';
import { Public } from '@/security/decorators/public.decorator';
import { ResendVerificationDto } from '@/auth/resend-verification/dto/ResendVerification.dto';
import { ResendVerificationService } from '@/auth/resend-verification/services/ResendVerification.service';

/**
 * POST /auth/resend-verification: email a fresh verification link. Validation, throttling and auth are declarative; the
 * service does the work.
 */
@ApiTags('auth')
@Controller('auth')
export class ResendVerificationController {
  constructor(private readonly service: ResendVerificationService) {}

  @Public()
  @Throttle(EMAIL_THROTTLE)
  @Post('resend-verification')
  @HttpCode(204)
  handle(@Body() body: ResendVerificationDto): Promise<void> {
    return this.service.handle(body);
  }
}
