import { z } from 'zod';
import { AvatarUrlSchema } from '@/common/validation/avatar-url.schema';
import { NameSchema } from '@/common/validation/name.schema';

/**
 * Every field is optional so a client can change one of them alone, which is what changing an avatar usually is. An
 * absent key leaves the column alone and an explicit `null` avatar clears it, so the two cases stay distinguishable.
 * The refine rejects an empty body, which would otherwise be an update that silently changes nothing.
 */
export const UpdateProfileSchema = z
  .object({
    firstName: NameSchema.optional(),
    lastName: NameSchema.optional(),
    avatarUrl: AvatarUrlSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one of firstName, lastName or avatarUrl',
  });

export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;
