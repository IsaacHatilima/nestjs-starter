import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { UserRepository } from '@/auth/shared/repositories/User.repository';
import { type Database, DRIZZLE } from '@/database/database.tokens';
import { users } from '@/database/schema';

export interface SetupTarget {
  email: string;
  twoFactorEnabled: boolean;
}

@Injectable()
export class SetupTotpRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly userRepository: UserRepository,
  ) {}

  async findById(userId: string): Promise<SetupTarget | null> {
    const row = await this.userRepository.findById(userId);
    return row ? { email: row.email, twoFactorEnabled: row.twoFactorEnabled } : null;
  }

  async savePendingSecret(userId: string, encryptedSecret: string): Promise<void> {
    await this.db
      .update(users)
      .set({ twoFactorPendingSecret: encryptedSecret, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}
