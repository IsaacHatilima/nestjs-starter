import { Injectable } from '@nestjs/common';
import { SessionRepository } from '@/auth/shared/repositories/Session.repository';
import { UserRepository } from '@/auth/shared/repositories/User.repository';
import type { SessionInput } from '@/auth/shared/types/AuthResult.types';
import type { UserCredentials } from '@/auth/shared/types/UserCredentials.types';
import { ProfileRepository } from '@/profile/shared/repositories/Profile.repository';
import { toProfile } from '@/profile/shared/types/Profile.mapper';
import type { Profile } from '@/profile/shared/types/Profile.types';

@Injectable()
export class LoginRepository {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly profileRepository: ProfileRepository,
  ) {}

  findCredentialsByEmail(email: string): Promise<UserCredentials | null> {
    return this.userRepository.findByEmail(email);
  }

  async findProfile(userId: string): Promise<Profile | null> {
    const row = await this.profileRepository.findByUserId(userId);
    return row ? toProfile(row) : null;
  }

  createSession(input: SessionInput): Promise<{ id: string }> {
    return this.sessionRepository.create(input);
  }
}
