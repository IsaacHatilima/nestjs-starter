import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { type Database, DRIZZLE } from '@/database/database.tokens';
import { sessions } from '@/database/schema';

@Injectable()
export class LogoutRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async revokeByRefreshTokenHash(hash: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.refreshTokenHash, hash), isNull(sessions.revokedAt)));
  }
}
