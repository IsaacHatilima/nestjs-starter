import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { type Database, DRIZZLE } from '@/database/database.tokens';
import { sessions } from '@/database/schema';

@Injectable()
export class RevokeSessionRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Revokes the session only if it belongs to the user; false when nothing matched. */
  async revokeOwned(userId: string, sessionId: string): Promise<boolean> {
    const rows = await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId), isNull(sessions.revokedAt)))
      .returning({ id: sessions.id });
    return rows.length > 0;
  }
}
