import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { type Database, DRIZZLE, type Executor } from '@/database/database.tokens';
import { twoFactorRecoveryCodes } from '@/database/schema';

/** Single-use two-factor recovery codes. */
@Injectable()
export class RecoveryCodeRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Marks a matching unused code as used; false when nothing matched. Same trick
   * as verification tokens: consume and check in one statement.
   */
  async consume(userId: string, codeHash: string): Promise<boolean> {
    const rows = await this.db
      .update(twoFactorRecoveryCodes)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(twoFactorRecoveryCodes.userId, userId),
          eq(twoFactorRecoveryCodes.codeHash, codeHash),
          isNull(twoFactorRecoveryCodes.usedAt),
        ),
      )
      .returning({ id: twoFactorRecoveryCodes.id });
    return rows.length > 0;
  }

  /** Pass `on` to join an open transaction; omitted, this runs on the pool. */
  async deleteAll(userId: string, on: Executor = this.db): Promise<void> {
    await on.delete(twoFactorRecoveryCodes).where(eq(twoFactorRecoveryCodes.userId, userId));
  }

  async replace(userId: string, codeHashes: readonly string[], on: Executor = this.db): Promise<void> {
    await this.deleteAll(userId, on);
    if (codeHashes.length === 0) return;
    await on.insert(twoFactorRecoveryCodes).values(codeHashes.map((codeHash) => ({ userId, codeHash })));
  }
}
