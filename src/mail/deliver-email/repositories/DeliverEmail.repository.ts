import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, eq, gt, isNull, lte, notInArray, or } from 'drizzle-orm';
import { type Database, DRIZZLE } from '@/database/database.tokens';
import { mailOutbox, verificationTokens } from '@/database/schema';

export interface ClaimedEmail {
  id: string;
  encryptedPayload: string;
  attempts: number;
  leaseId: string;
}

@Injectable()
export class DeliverEmailRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Expired or consumed tokens must never be mailed after a delayed retry. */
  async discardInvalid(): Promise<void> {
    const liveTokens = this.db
      .select({ tokenHash: verificationTokens.tokenHash })
      .from(verificationTokens)
      .where(and(isNull(verificationTokens.consumedAt), gt(verificationTokens.expiresAt, new Date())));
    await this.db.delete(mailOutbox).where(notInArray(mailOutbox.tokenHash, liveTokens));
  }

  /** Release the row lock before SMTP; leases recover abandoned work after a crash. */
  async claim(leaseMs: number): Promise<ClaimedEmail | null> {
    return this.db.transaction(async (tx) => {
      const now = new Date();
      const [row] = await tx
        .select({ id: mailOutbox.id, encryptedPayload: mailOutbox.encryptedPayload, attempts: mailOutbox.attempts })
        .from(mailOutbox)
        .innerJoin(verificationTokens, eq(verificationTokens.tokenHash, mailOutbox.tokenHash))
        .where(
          and(
            lte(mailOutbox.availableAt, now),
            or(isNull(mailOutbox.leaseUntil), lte(mailOutbox.leaseUntil, now)),
            isNull(verificationTokens.consumedAt),
            gt(verificationTokens.expiresAt, now),
          ),
        )
        .orderBy(mailOutbox.availableAt, mailOutbox.id)
        .limit(1)
        .for('update', { of: mailOutbox, skipLocked: true });
      if (!row) return null;
      const leaseId = randomUUID();
      const attempts = row.attempts + 1;
      await tx
        .update(mailOutbox)
        .set({ attempts, leaseId, leaseUntil: new Date(now.getTime() + leaseMs) })
        .where(eq(mailOutbox.id, row.id));
      return { ...row, attempts, leaseId };
    });
  }

  async complete(id: string, leaseId: string): Promise<void> {
    await this.db.delete(mailOutbox).where(and(eq(mailOutbox.id, id), eq(mailOutbox.leaseId, leaseId)));
  }

  async retry(id: string, leaseId: string, delayMs: number): Promise<void> {
    await this.db
      .update(mailOutbox)
      .set({ availableAt: new Date(Date.now() + delayMs), leaseId: null, leaseUntil: null })
      .where(and(eq(mailOutbox.id, id), eq(mailOutbox.leaseId, leaseId)));
  }

  async renew(id: string, leaseId: string, leaseMs: number): Promise<void> {
    await this.db
      .update(mailOutbox)
      .set({ leaseUntil: new Date(Date.now() + leaseMs) })
      .where(and(eq(mailOutbox.id, id), eq(mailOutbox.leaseId, leaseId)));
  }
}
