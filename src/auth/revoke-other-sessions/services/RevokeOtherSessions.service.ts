import { Injectable } from '@nestjs/common';
import type { AuthPrincipal } from '@/security/auth-principal';
import { SessionRepository } from '@/auth/shared/repositories/Session.repository';

@Injectable()
export class RevokeOtherSessionsService {
  constructor(private readonly sessionRepository: SessionRepository) {}

  handle(auth: AuthPrincipal): Promise<void> {
    return this.sessionRepository.revokeOthers(auth.userId, auth.sessionId);
  }
}
