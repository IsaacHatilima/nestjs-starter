import { Inject, Injectable } from '@nestjs/common';
import { RecoveryCodeRepository } from '@/auth/shared/repositories/RecoveryCode.repository';
import { UserRepository } from '@/auth/shared/repositories/User.repository';
import type { UserCredentials } from '@/auth/shared/types/UserCredentials.types';
import { type Database, DRIZZLE } from '@/database/database.tokens';

@Injectable()
export class RegenerateRecoveryCodesRepository {
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

  /** Deletes and re-inserts inside one transaction so a failure never leaves the user without codes. */
  replaceRecoveryCodes(userId: string, codeHashes: readonly string[]): Promise<void> {
    return this.db.transaction((tx) => this.codeRepository.replace(userId, codeHashes, tx));
  }
}
