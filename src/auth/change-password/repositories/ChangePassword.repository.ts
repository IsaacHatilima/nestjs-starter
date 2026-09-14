import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { SessionRepository } from '@/auth/shared/repositories/Session.repository';
import { UserRepository } from '@/auth/shared/repositories/User.repository';
import { type Database, DRIZZLE } from '@/database/database.tokens';
import { users } from '@/database/schema';

@Injectable()
export class ChangePasswordRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
  ) {}

  async findPasswordHash(userId: string): Promise<string | null> {
    const row = await this.userRepository.findById(userId);
    return row?.passwordHash ?? null;
  }

  /** Stores the new hash and signs out every other session in one transaction. */
  changePassword(userId: string, passwordHash: string, keepSessionId: string): Promise<void> {
    return this.db.transaction(async (tx) => {
      await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
      await this.sessionRepository.revokeOthers(userId, keepSessionId, tx);
    });
  }
}
