import type { z } from 'zod';
import type { ProfileSchema } from '@/profile/shared/schemas/Profile.schema';

/** Public profile output and its OpenAPI schema share one definition. */
export type Profile = z.infer<typeof ProfileSchema>;

/** The fields an update may change. An absent key leaves the column alone; `avatarUrl: null` clears it. */
export interface ProfileChanges {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
}
