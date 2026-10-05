import { Injectable } from '@nestjs/common';
import { ProfileRepository } from '@/profile/shared/repositories/Profile.repository';
import { toProfile } from '@/profile/shared/types/Profile.mapper';
import type { Profile } from '@/profile/shared/types/Profile.types';

/** Maps profile rows for the login response; shared table access is injected into the service directly. */
@Injectable()
export class LoginRepository {
  constructor(private readonly profileRepository: ProfileRepository) {}

  async findProfile(userId: string): Promise<Profile | null> {
    const row = await this.profileRepository.findByUserId(userId);
    return row ? toProfile(row) : null;
  }
}
