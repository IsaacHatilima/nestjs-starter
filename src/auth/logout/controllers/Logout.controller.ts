import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CREDENTIAL_THROTTLE } from '@/common/throttle';
import { Public } from '@/security/decorators/public.decorator';
import { LogoutDto } from '@/auth/logout/dto/Logout.dto';
import { LogoutService } from '@/auth/logout/services/Logout.service';

/**
 * POST /auth/logout: revoke the session behind a refresh token. Validation, throttling and auth are declarative; the
 * service does the work.
 */
@ApiTags('auth')
@Controller('auth')
export class LogoutController {
  constructor(private readonly service: LogoutService) {}

  @Public()
  @Throttle(CREDENTIAL_THROTTLE)
  @Post('logout')
  @HttpCode(204)
  handle(@Body() body: LogoutDto): Promise<void> {
    return this.service.handle(body);
  }
}
