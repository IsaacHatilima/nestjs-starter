import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { EMAIL_THROTTLE } from '@/common/throttle';
import { Public } from '@/security/decorators/public.decorator';
import { ForgotPasswordDto } from '@/auth/forgot-password/dto/ForgotPassword.dto';
import { ForgotPasswordService } from '@/auth/forgot-password/services/ForgotPassword.service';

/**
 * POST /auth/forgot-password: email a password reset link. Validation, throttling and auth are declarative; the service
 * does the work.
 */
@ApiTags('auth')
@Controller('auth')
export class ForgotPasswordController {
  constructor(private readonly service: ForgotPasswordService) {}

  @Public()
  @Throttle(EMAIL_THROTTLE)
  @Post('forgot-password')
  @HttpCode(204)
  handle(@Body() body: ForgotPasswordDto): Promise<void> {
    return this.service.handle(body);
  }
}
