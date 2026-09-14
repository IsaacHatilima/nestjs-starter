import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, ne } from 'drizzle-orm';
import { type Database, DRIZZLE, type Executor } from '@/database/database.tokens';
import { type NewSessionRow, sessions } from '@/database/schema';

/** Writes on `sessions` that more than one flow needs. */
@Injectable()
export class SessionRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: NewSessionRow): Promise<{ id: string }> {
    const [row] = await this.db.insert(sessions).values(input).returning({ id: sessions.id });
    return row;
  }

  /** Pass `on` to join an open transaction; omitted, this runs on the pool. */
  async revokeOthers(userId: string, keepSessionId: string, on: Executor = this.db): Promise<void> {
    await on
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.userId, userId), ne(sessions.id, keepSessionId), isNull(sessions.revokedAt)));
  }
}
