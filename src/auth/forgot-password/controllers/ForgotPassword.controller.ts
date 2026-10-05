import { z } from 'zod';
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiEnvelopeResponse } from '@/common/openapi/api-envelope-response.decorator';
import { EMAIL_THROTTLE } from '@/common/throttle';
import { Public } from '@/security/decorators/public.decorator';
import { ForgotPasswordDto } from '@/auth/forgot-password/dto/ForgotPassword.dto';
import { ForgotPasswordService } from '@/auth/forgot-password/services/ForgotPassword.service';

/**
 * POST /auth/forgot-password: queue a password reset email. Validation, throttling and auth are declarative;
 * the service does the work.
 */
@ApiTags('auth')
@Controller('auth')
export class ForgotPasswordController {
  constructor(private readonly service: ForgotPasswordService) {}

  @Public()
  @Throttle(EMAIL_THROTTLE)
  @Post('forgot-password')
  @HttpCode(200)
  @ApiEnvelopeResponse({ data: z.null(), validation: true })
  handle(@Body() body: ForgotPasswordDto): Promise<void> {
    return this.service.handle(body);
  }
}
