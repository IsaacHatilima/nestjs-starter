import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { RecoveryCodeRepository } from '@/auth/shared/repositories/RecoveryCode.repository';
import { UserRepository } from '@/auth/shared/repositories/User.repository';
import type { UserCredentials } from '@/auth/shared/types/UserCredentials.types';
import { type Database, DRIZZLE } from '@/database/database.tokens';
import { users } from '@/database/schema';

@Injectable()
export class DisableTotpRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly userRepository: UserRepository,
    private readonly codeRepository: RecoveryCodeRepository,
  ) {}

  findCredentialsById(userId: string): Promise<UserCredentials | null> {
    return this.userRepository.findById(userId);
  }

  recordTotpStep(userId: string, step: number): Promise<boolean> {
    return this.userRepository.recordTotpStep(userId, step);
  }

  consumeRecoveryCode(userId: string, codeHash: string): Promise<boolean> {
    return this.codeRepository.consume(userId, codeHash);
  }

  disable(userId: string): Promise<void> {
    return this.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorPendingSecret: null,
          twoFactorLastUsedStep: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
      await this.codeRepository.deleteAll(userId, tx);
    });
  }
}
