import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CREDENTIAL_THROTTLE } from '@/common/throttle';
import { Public } from '@/security/decorators/public.decorator';
import { RegisterDto } from '@/auth/register/dto/Register.dto';
import { RegisterService } from '@/auth/register/services/Register.service';
import type { User } from '@/auth/shared/types/User.types';

/**
 * POST /auth/register: create an account and email a verification link. Validation, throttling and auth are
 * declarative; the service does the work.
 */
@ApiTags('auth')
@Controller('auth')
export class RegisterController {
  constructor(private readonly service: RegisterService) {}

  @Public()
  @Throttle(CREDENTIAL_THROTTLE)
  @Post('register')
  handle(@Body() body: RegisterDto): Promise<User> {
    return this.service.handle(body);
  }
}
