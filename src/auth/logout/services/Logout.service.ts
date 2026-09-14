import { Injectable } from '@nestjs/common';
import { TokenService } from '@/security/token.service';
import { LogoutRepository } from '@/auth/logout/repositories/Logout.repository';
import type { Logout } from '@/auth/logout/schemas/Logout.schema';

/** Revokes the session behind a refresh token. Idempotent: unknown tokens are ignored. */
@Injectable()
export class LogoutService {
  constructor(
    private readonly repository: LogoutRepository,
    private readonly tokens: TokenService,
  ) {}

  handle(data: Logout): Promise<void> {
    return this.repository.revokeByRefreshTokenHash(this.tokens.hashOpaqueToken(data.refreshToken));
  }
}
