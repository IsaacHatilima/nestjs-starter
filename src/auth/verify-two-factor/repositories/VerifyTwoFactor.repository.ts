import { Injectable } from '@nestjs/common';
import { RecoveryCodeRepository } from '@/auth/shared/repositories/RecoveryCode.repository';
import { SessionRepository } from '@/auth/shared/repositories/Session.repository';
import { UserRepository } from '@/auth/shared/repositories/User.repository';
import type { SessionInput } from '@/auth/shared/types/AuthResult.types';
import type { UserCredentials } from '@/auth/shared/types/UserCredentials.types';
import { ProfileRepository } from '@/profile/shared/repositories/Profile.repository';
import { toProfile } from '@/profile/shared/types/Profile.mapper';
import type { Profile } from '@/profile/shared/types/Profile.types';

@Injectable()
export class VerifyTwoFactorRepository {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly codeRepository: RecoveryCodeRepository,
    private readonly profileRepository: ProfileRepository,
  ) {}

  findCredentialsById(userId: string): Promise<UserCredentials | null> {
    return this.userRepository.findById(userId);
  }

  async findProfile(userId: string): Promise<Profile | null> {
    const row = await this.profileRepository.findByUserId(userId);
    return row ? toProfile(row) : null;
  }

  recordTotpStep(userId: string, step: number): Promise<boolean> {
    return this.userRepository.recordTotpStep(userId, step);
  }

  consumeRecoveryCode(userId: string, codeHash: string): Promise<boolean> {
    return this.codeRepository.consume(userId, codeHash);
  }

  createSession(input: SessionInput): Promise<{ id: string }> {
    return this.sessionRepository.create(input);
  }
}
