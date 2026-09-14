import { Injectable } from '@nestjs/common';
import type { AuthPrincipal } from '@/security/auth-principal';
import { RevokeOtherSessionsRepository } from '@/auth/revoke-other-sessions/repositories/RevokeOtherSessions.repository';

@Injectable()
export class RevokeOtherSessionsService {
  constructor(private readonly repository: RevokeOtherSessionsRepository) {}

  handle(auth: AuthPrincipal): Promise<void> {
    return this.repository.revokeAllExcept(auth.userId, auth.sessionId);
  }
}
