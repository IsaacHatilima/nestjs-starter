import { z } from 'zod';
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiEnvelopeResponse } from '@/common/openapi/api-envelope-response.decorator';
import { EMAIL_THROTTLE } from '@/common/throttle';
import { Public } from '@/security/decorators/public.decorator';
import { ResendVerificationDto } from '@/auth/resend-verification/dto/ResendVerification.dto';
import { ResendVerificationService } from '@/auth/resend-verification/services/ResendVerification.service';

/**
 * POST /auth/resend-verification: queue a fresh verification email. Validation, throttling and auth are declarative;
 * the service does the work.
 */
@ApiTags('auth')
@Controller('auth')
export class ResendVerificationController {
  constructor(private readonly service: ResendVerificationService) {}

  @Public()
  @Throttle(EMAIL_THROTTLE)
  @Post('resend-verification')
  @HttpCode(200)
  @ApiEnvelopeResponse({ data: z.null(), validation: true })
  handle(@Body() body: ResendVerificationDto): Promise<void> {
    return this.service.handle(body);
  }
}
