import { z } from 'zod';
import { ExistingPasswordSchema, PasswordSchema } from '@/common/validation/password.schema';

export const ChangePasswordSchema = z.object({
  currentPassword: ExistingPasswordSchema,
  newPassword: PasswordSchema,
});

export type ChangePassword = z.infer<typeof ChangePasswordSchema>;
