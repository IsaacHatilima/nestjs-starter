import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiEnvelopeResponse } from '@/common/openapi/api-envelope-response.decorator';
import { ErrorCode } from '@/common/errors/error-codes';
import { LoginResultSchema } from '@/auth/shared/schemas/AuthResult.schema';
import { CREDENTIAL_THROTTLE } from '@/common/throttle';
import { Public } from '@/security/decorators/public.decorator';
import { RequestMeta } from '@/security/decorators/request-meta.decorator';
import type { RequestMeta as RequestMetaShape } from '@/security/request-meta';
import { LoginDto } from '@/auth/login/dto/Login.dto';
import { LoginService } from '@/auth/login/services/Login.service';
import type { LoginResult } from '@/auth/shared/types/AuthResult.types';

/**
 * POST /auth/login: password step; answers with tokens or a two-factor challenge. Validation, throttling and auth are
 * declarative; the service does the work.
 */
@ApiTags('auth')
@Controller('auth')
export class LoginController {
  constructor(private readonly service: LoginService) {}

  @Public()
  @Throttle(CREDENTIAL_THROTTLE)
  @Post('login')
  @HttpCode(200)
  @ApiEnvelopeResponse({
    data: LoginResultSchema,
    validation: true,
    errors: [ErrorCode.INVALID_CREDENTIALS, ErrorCode.EMAIL_NOT_VERIFIED, ErrorCode.NOT_FOUND],
  })
  handle(@Body() body: LoginDto, @RequestMeta() meta: RequestMetaShape): Promise<LoginResult> {
    return this.service.handle(body, meta);
  }
}
