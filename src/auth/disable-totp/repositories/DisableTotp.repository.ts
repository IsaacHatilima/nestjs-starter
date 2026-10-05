import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { RecoveryCodeRepository } from '@/auth/shared/repositories/RecoveryCode.repository';
import { type Database, DRIZZLE } from '@/database/database.tokens';
import { users } from '@/database/schema';

@Injectable()
export class DisableTotpRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly codeRepository: RecoveryCodeRepository,
  ) {}

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
