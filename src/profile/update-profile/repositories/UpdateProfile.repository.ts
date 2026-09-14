import { Injectable } from '@nestjs/common';
import { ProfileRepository } from '@/profile/shared/repositories/Profile.repository';
import { toProfile } from '@/profile/shared/types/Profile.mapper';
import type { Profile, ProfileChanges } from '@/profile/shared/types/Profile.types';

@Injectable()
export class UpdateProfileRepository {
  constructor(private readonly profileRepository: ProfileRepository) {}

  async update(userId: string, changes: ProfileChanges): Promise<Profile | null> {
    const row = await this.profileRepository.update(userId, changes);
    return row ? toProfile(row) : null;
  }
}
