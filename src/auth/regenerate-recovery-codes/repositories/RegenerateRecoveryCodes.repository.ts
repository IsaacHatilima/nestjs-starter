import { Inject, Injectable } from '@nestjs/common';
import { RecoveryCodeRepository } from '@/auth/shared/repositories/RecoveryCode.repository';
import { type Database, DRIZZLE } from '@/database/database.tokens';

@Injectable()
export class RegenerateRecoveryCodesRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly codeRepository: RecoveryCodeRepository,
  ) {}

  /** Deletes and re-inserts inside one transaction so a failure never leaves the user without codes. */
  replaceRecoveryCodes(userId: string, codeHashes: readonly string[]): Promise<void> {
    return this.db.transaction((tx) => this.codeRepository.replace(userId, codeHashes, tx));
  }
}
