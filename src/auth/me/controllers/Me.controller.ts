import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthPrincipal } from '@/security/auth-principal';
import { CurrentAuth } from '@/security/decorators/current-auth.decorator';
import { MeService } from '@/auth/me/services/Me.service';
import type { User } from '@/auth/shared/types/User.types';

/** GET /auth/me: the signed-in user. Validation, throttling and auth are declarative; the service does the work. */
@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class MeController {
  constructor(private readonly service: MeService) {}

  @Get('me')
  handle(@CurrentAuth() auth: AuthPrincipal): Promise<User> {
    return this.service.handle(auth);
  }
}
