import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
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

  /**
   * Drops any unconsumed token of the same purpose for the user, then stores the new one.
   * Pass the flow transaction so its advisory lock also covers the outbox enqueue.
   * The default executor intentionally fails: a pool statement would release the lock too early.
   */
  async replace(input: NewVerificationToken, on: Executor = this.db): Promise<void> {
    if (on === this.db) throw new Error('Token replacement requires a flow transaction');
    // Separate from row locks, so consuming a token and updating its user cannot invert the lock order.
    await on.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${input.userId}:${input.purpose}`}, 0))`);
    await on
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.userId, input.userId),
          eq(verificationTokens.purpose, input.purpose),
          isNull(verificationTokens.consumedAt),
        ),
      );
    await on.insert(verificationTokens).values(input);
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
