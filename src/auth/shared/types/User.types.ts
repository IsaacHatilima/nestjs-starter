import type { z } from 'zod';
import type { UserSchema } from '@/auth/shared/schemas/User.schema';

/** The public shape of an account. Never carries hashes or secrets. */
export type User = z.infer<typeof UserSchema>;
