import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { type Database, DRIZZLE } from '@/database/database.tokens';
import { sessions } from '@/database/schema';

export interface ActiveSession {
  id: string;
  userId: string;
}

/** Looks up sessions for the access token guard: must exist, be unrevoked and unexpired. */
@Injectable()
export class ActiveSessionRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findActive(sessionId: string): Promise<ActiveSession | null> {
    const [row] = await this.db
      .select({ id: sessions.id, userId: sessions.userId })
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
      .limit(1);
    return row ?? null;
  }
}
