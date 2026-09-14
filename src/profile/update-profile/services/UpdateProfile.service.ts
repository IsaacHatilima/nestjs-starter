import { Injectable } from '@nestjs/common';
import { notFound } from '@/common/errors/auth-errors';
import type { AuthPrincipal } from '@/security/auth-principal';
import { UpdateProfileRepository } from '@/profile/update-profile/repositories/UpdateProfile.repository';
import type { UpdateProfile } from '@/profile/update-profile/schemas/UpdateProfile.schema';
import type { Profile } from '@/profile/shared/types/Profile.types';

/** Applies a partial change to the signed-in user's profile. Only the caller's own row is ever reachable. */
@Injectable()
export class UpdateProfileService {
  constructor(private readonly repository: UpdateProfileRepository) {}

  async handle(auth: AuthPrincipal, data: UpdateProfile): Promise<Profile> {
    // The schema has already dropped unknown keys and rejected an empty body, so `data` is exactly what to change.
    const profile = await this.repository.update(auth.userId, data);
    if (!profile) throw notFound('Profile');
    return profile;
  }
}
