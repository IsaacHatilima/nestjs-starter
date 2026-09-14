import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { RecoveryCodeRepository } from '@/auth/shared/repositories/RecoveryCode.repository';
import { UserRepository } from '@/auth/shared/repositories/User.repository';
import { type Database, DRIZZLE } from '@/database/database.tokens';
import { users } from '@/database/schema';

export interface EnableTarget {
  twoFactorEnabled: boolean;
  twoFactorPendingSecret: string | null;
}

export interface Enablement {
  /** The encrypted pending secret being promoted. */
  secret: string;
  lastUsedStep: number;
  recoveryCodeHashes: readonly string[];
}

@Injectable()
export class EnableTotpRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly userRepository: UserRepository,
    private readonly codeRepository: RecoveryCodeRepository,
  ) {}

  async findById(userId: string): Promise<EnableTarget | null> {
    const row = await this.userRepository.findById(userId);
    return row
      ? {
          twoFactorEnabled: row.twoFactorEnabled,
          twoFactorPendingSecret: row.twoFactorPendingSecret,
        }
      : null;
  }

  enable(userId: string, input: Enablement): Promise<void> {
    return this.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          twoFactorEnabled: true,
          twoFactorSecret: input.secret,
          twoFactorPendingSecret: null,
          twoFactorLastUsedStep: input.lastUsedStep,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
      await this.codeRepository.replace(userId, input.recoveryCodeHashes, tx);
    });
  }
}
