import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { type Database, DRIZZLE } from '@/database/database.tokens';
import { sessions } from '@/database/schema';

export interface ActiveSession {
  id: string;
  userId: string;
}

export interface Rotation {
  refreshTokenHash: string;
  previousRefreshTokenHash: string;
}

@Injectable()
export class RefreshTokenRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findActiveByRefreshTokenHash(hash: string): Promise<ActiveSession | null> {
    const [row] = await this.db
      .select({ id: sessions.id, userId: sessions.userId })
      .from(sessions)
      .where(and(eq(sessions.refreshTokenHash, hash), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
      .limit(1);
    return row ?? null;
  }

  /** A hit here means a token that was already rotated away is being presented again. */
  async findByPreviousRefreshTokenHash(hash: string): Promise<{ id: string } | null> {
    const [row] = await this.db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.previousRefreshTokenHash, hash))
      .limit(1);
    return row ?? null;
  }

  /** Moves the current hash to `previous` so a later replay can be recognised. */
  async rotate(sessionId: string, rotation: Rotation): Promise<void> {
    await this.db
      .update(sessions)
      .set({ ...rotation, lastUsedAt: new Date() })
      .where(eq(sessions.id, sessionId));
  }

  async revoke(sessionId: string): Promise<void> {
    await this.db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, sessionId));
  }
}
