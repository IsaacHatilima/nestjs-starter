import { Injectable } from '@nestjs/common';
import type { AuthPrincipal } from '@/security/auth-principal';
import { ListSessionsRepository } from '@/auth/list-sessions/repositories/ListSessions.repository';
import type { Session, SessionRecord } from '@/auth/list-sessions/types/Session.types';

function toSession(record: SessionRecord, currentSessionId: string): Session {
  return {
    id: record.id,
    ip: record.ip,
    userAgent: record.userAgent,
    current: record.id === currentSessionId,
    createdAt: record.createdAt.toISOString(),
    lastUsedAt: record.lastUsedAt.toISOString(),
    expiresAt: record.expiresAt.toISOString(),
  };
}

@Injectable()
export class ListSessionsService {
  constructor(private readonly repository: ListSessionsRepository) {}

  async handle(auth: AuthPrincipal): Promise<Session[]> {
    const records = await this.repository.findActiveByUser(auth.userId);
    // The caller's own session is flagged so the UI can protect it from accidental revocation.
    return records.map((record) => toSession(record, auth.sessionId));
  }
}
