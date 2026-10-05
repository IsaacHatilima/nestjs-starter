import { z } from 'zod';
import { ProfileSchema } from '@/profile/shared/schemas/Profile.schema';

/** Public account output. Hashes and secrets intentionally have no place in this schema. */
export const UserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  emailVerified: z.boolean(),
  twoFactorEnabled: z.boolean(),
  profile: ProfileSchema.describe('Registration creates the profile with its account in one transaction.'),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
