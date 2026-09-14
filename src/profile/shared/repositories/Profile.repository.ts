import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { type Database, DRIZZLE, type Executor } from '@/database/database.tokens';
import { type NewProfileRow, type ProfileRow, profiles } from '@/database/schema';
import type { ProfileChanges } from '@/profile/shared/types/Profile.types';

/** Reads and writes on `profiles` that more than one flow needs, in this area and in auth. */
@Injectable()
export class ProfileRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Pass `on` to join an open transaction; omitted, this runs on the pool. Registration needs the transaction so an
   * account can never exist without its profile.
   */
  async create(input: NewProfileRow, on: Executor = this.db): Promise<ProfileRow> {
    const [row] = await on.insert(profiles).values(input).returning();
    return row;
  }

  async findByUserId(userId: string): Promise<ProfileRow | null> {
    const [row] = await this.db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    return row ?? null;
  }

  /** Applies the given changes and returns the updated row; null when the user has no profile. */
  async update(userId: string, changes: ProfileChanges): Promise<ProfileRow | null> {
    const [row] = await this.db
      .update(profiles)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(profiles.userId, userId))
      .returning();
    return row ?? null;
  }
}
