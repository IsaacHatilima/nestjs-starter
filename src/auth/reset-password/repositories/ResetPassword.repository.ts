import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { VerificationTokenRepository } from '@/auth/shared/repositories/VerificationToken.repository';
import { type Database, DRIZZLE } from '@/database/database.tokens';
import { sessions, users } from '@/database/schema';

@Injectable()
export class ResetPasswordRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly tokenRepository: VerificationTokenRepository,
  ) {}

  /**
   * Consumes the reset token, stores the new hash, treats the email as verified
   * (the owner just proved they read it) and signs every session out.
   * False when the token is unknown, used or expired.
   */
  resetWithToken(tokenHash: string, passwordHash: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const token = await this.tokenRepository.consume(tokenHash, 'password_reset', tx);
      if (!token) return false;
      const now = new Date();
      await tx
        .update(users)
        .set({
          passwordHash,
          emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, ${now})`,
          updatedAt: now,
        })
        .where(eq(users.id, token.userId));
      await tx
        .update(sessions)
        .set({ revokedAt: now })
        .where(and(eq(sessions.userId, token.userId), isNull(sessions.revokedAt)));
      return true;
    });
  }
}
