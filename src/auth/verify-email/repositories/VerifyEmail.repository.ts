import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { VerificationTokenRepository } from '@/auth/shared/repositories/VerificationToken.repository';
import { type Database, DRIZZLE } from '@/database/database.tokens';
import { users } from '@/database/schema';

@Injectable()
export class VerifyEmailRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly tokenRepository: VerificationTokenRepository,
  ) {}

  /** Consumes the token and marks its owner verified; false when the token is unusable. */
  verifyWithToken(tokenHash: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const token = await this.tokenRepository.consume(tokenHash, 'email_verification', tx);
      if (!token) return false;
      const now = new Date();
      await tx.update(users).set({ emailVerifiedAt: now, updatedAt: now }).where(eq(users.id, token.userId));
      return true;
    });
  }
}
