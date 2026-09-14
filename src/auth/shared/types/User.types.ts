import type { Profile } from '@/profile/shared/types/Profile.types';

/** The public shape of an account. Never carries hashes or secrets. */
export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  /** Always present: registration creates the profile row in the same transaction as the account. */
  profile: Profile;
  createdAt: string;
  updatedAt: string;
}
