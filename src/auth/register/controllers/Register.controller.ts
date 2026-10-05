import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiEnvelopeResponse } from '@/common/openapi/api-envelope-response.decorator';
import { ErrorCode } from '@/common/errors/error-codes';
import { UserSchema } from '@/auth/shared/schemas/User.schema';
import { CREDENTIAL_THROTTLE } from '@/common/throttle';
import { Public } from '@/security/decorators/public.decorator';
import { RegisterDto } from '@/auth/register/dto/Register.dto';
import { RegisterService } from '@/auth/register/services/Register.service';
import type { User } from '@/auth/shared/types/User.types';

/**
 * POST /auth/register: create an account and queue a verification email. Validation, throttling and auth are
 * declarative; the service does the work.
 */
@ApiTags('auth')
@Controller('auth')
export class RegisterController {
  constructor(private readonly service: RegisterService) {}

  @Public()
  @Throttle(CREDENTIAL_THROTTLE)
  @Post('register')
  @ApiEnvelopeResponse({
    data: UserSchema,
    status: 201,
    validation: true,
    errors: [ErrorCode.PASSWORD_COMPROMISED, ErrorCode.EMAIL_ALREADY_REGISTERED],
  })
  handle(@Body() body: RegisterDto): Promise<User> {
    return this.service.handle(body);
  }
}
