import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { type Database, DRIZZLE } from '@/database/database.tokens';
import { sessions } from '@/database/schema';
import type { SessionRecord } from '@/auth/list-sessions/types/Session.types';

@Injectable()
export class ListSessionsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Unrevoked, unexpired sessions, most recently used first. */
  findActiveByUser(userId: string): Promise<SessionRecord[]> {
    return this.db
      .select({
        id: sessions.id,
        ip: sessions.ip,
        userAgent: sessions.userAgent,
        createdAt: sessions.createdAt,
        lastUsedAt: sessions.lastUsedAt,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
      .orderBy(desc(sessions.lastUsedAt));
  }
}
