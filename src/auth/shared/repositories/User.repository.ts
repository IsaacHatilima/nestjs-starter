import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, lt, or } from 'drizzle-orm';
import { type Database, DRIZZLE } from '@/database/database.tokens';
import { type UserRow, users } from '@/database/schema';

/** Reads and writes on `users` that more than one flow needs. */
@Injectable()
export class UserRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findById(id: string): Promise<UserRow | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const [row] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return row ?? null;
  }

  /**
   * Claims a TOTP time step for the user. The update only succeeds when the step
   * is newer than the last one recorded, so two concurrent requests presenting
   * the same code cannot both pass; returns false when the step was already used.
   */
  async recordTotpStep(userId: string, step: number): Promise<boolean> {
    const rows = await this.db
      .update(users)
      .set({ twoFactorLastUsedStep: step, updatedAt: new Date() })
      .where(and(eq(users.id, userId), or(isNull(users.twoFactorLastUsedStep), lt(users.twoFactorLastUsedStep, step))))
      .returning({ id: users.id });
    return rows.length > 0;
  }
}
