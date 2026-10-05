import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiEnvelopeResponse } from '@/common/openapi/api-envelope-response.decorator';
import { ErrorCode } from '@/common/errors/error-codes';
import { TokenPairSchema } from '@/auth/shared/schemas/AuthResult.schema';
import { CREDENTIAL_THROTTLE } from '@/common/throttle';
import { Public } from '@/security/decorators/public.decorator';
import { RefreshTokenDto } from '@/auth/refresh-token/dto/RefreshToken.dto';
import { RefreshTokenService } from '@/auth/refresh-token/services/RefreshToken.service';
import type { TokenPair } from '@/auth/shared/types/AuthResult.types';

/**
 * POST /auth/refresh-token: rotate the refresh token and issue a new access token. Validation, throttling and auth are
 * declarative; the service does the work.
 */
@ApiTags('auth')
@Controller('auth')
export class RefreshTokenController {
  constructor(private readonly service: RefreshTokenService) {}

  @Public()
  @Throttle(CREDENTIAL_THROTTLE)
  @Post('refresh-token')
  @HttpCode(200)
  @ApiEnvelopeResponse({
    data: TokenPairSchema,
    validation: true,
    errors: [ErrorCode.INVALID_TOKEN, ErrorCode.SESSION_REVOKED],
  })
  handle(@Body() body: RefreshTokenDto): Promise<TokenPair> {
    return this.service.handle(body);
  }
}
