import { z } from 'zod';

/** Public output schema; input normalization belongs to each flow's request schema. */
export const ProfileSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  avatarUrl: z.string().nullable(),
});
