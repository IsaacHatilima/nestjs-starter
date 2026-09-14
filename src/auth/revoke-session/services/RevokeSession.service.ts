import { Injectable } from '@nestjs/common';
import { notFound } from '@/common/errors/auth-errors';
import type { AuthPrincipal } from '@/security/auth-principal';
import { RevokeSessionRepository } from '@/auth/revoke-session/repositories/RevokeSession.repository';
import type { RevokeSession } from '@/auth/revoke-session/schemas/RevokeSession.schema';

@Injectable()
export class RevokeSessionService {
  constructor(private readonly repository: RevokeSessionRepository) {}

  async handle(auth: AuthPrincipal, data: RevokeSession): Promise<void> {
    const revoked = await this.repository.revokeOwned(auth.userId, data.sessionId);
    // The query is scoped to the caller, so a foreign id looks the same as an unknown one.
    if (!revoked) throw notFound('Session');
  }
}
