import type { ProfileRow } from '@/database/schema';
import type { Profile } from './Profile.types';

/** Narrows a `profiles` row to the public shape: the row's ids and timestamps never reach a client. */
export function toProfile(record: Pick<ProfileRow, 'firstName' | 'lastName' | 'avatarUrl'>): Profile {
  return {
    firstName: record.firstName,
    lastName: record.lastName,
    avatarUrl: record.avatarUrl,
  };
}
