import type { Profile } from '@/profile/shared/types/Profile.types';
import type { User } from './User.types';
import type { UserCredentials } from './UserCredentials.types';

export function toUser(record: UserCredentials, profile: Profile): User {
  return {
    id: record.id,
    email: record.email,
    emailVerified: record.emailVerifiedAt !== null,
    twoFactorEnabled: record.twoFactorEnabled,
    profile,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
