import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { type Database, DRIZZLE, type Executor } from '@/database/database.tokens';
import { type TokenPurpose, verificationTokens } from '@/database/schema';

export interface NewVerificationToken {
  userId: string;
  purpose: TokenPurpose;
  tokenHash: string;
  expiresAt: Date;
}

/** Email-verification and password-reset tokens; both are single-use. */
@Injectable()
export class VerificationTokenRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Drops any unconsumed token of the same purpose for the user, then stores the new one. */
  async replace(input: NewVerificationToken): Promise<void> {
    await this.db
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.userId, input.userId),
          eq(verificationTokens.purpose, input.purpose),
          isNull(verificationTokens.consumedAt),
        ),
      );
    await this.db.insert(verificationTokens).values(input);
  }

  /**
   * Consumes an unused, unexpired token and returns its owner; null when nothing
   * matched. A single conditional UPDATE both checks and consumes the token, so
   * it cannot be used twice. Pass `on` to join an open transaction.
   */
  async consume(tokenHash: string, purpose: TokenPurpose, on: Executor = this.db): Promise<{ userId: string } | null> {
    const [row] = await on
      .update(verificationTokens)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(verificationTokens.tokenHash, tokenHash),
          eq(verificationTokens.purpose, purpose),
          isNull(verificationTokens.consumedAt),
          gt(verificationTokens.expiresAt, new Date()),
        ),
      )
      .returning({ userId: verificationTokens.userId });
    return row ?? null;
  }
}
