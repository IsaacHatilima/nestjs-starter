import { Injectable } from '@nestjs/common';
import { UserRepository } from '@/auth/shared/repositories/User.repository';
import { toUser } from '@/auth/shared/types/User.mapper';
import type { User } from '@/auth/shared/types/User.types';
import { ProfileRepository } from '@/profile/shared/repositories/Profile.repository';
import { toProfile } from '@/profile/shared/types/Profile.mapper';

@Injectable()
export class MeRepository {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly profileRepository: ProfileRepository,
  ) {}

  async findById(userId: string): Promise<User | null> {
    const row = await this.userRepository.findById(userId);
    if (!row) return null;
    const profile = await this.profileRepository.findByUserId(userId);
    // Registration writes both rows in one transaction, so a missing profile means the row was deleted by hand.
    return profile ? toUser(row, toProfile(profile)) : null;
  }
}
