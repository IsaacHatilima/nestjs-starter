import { z } from 'zod';
import { PasswordSchema } from '@/common/validation/password.schema';

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: PasswordSchema,
});

export type ResetPassword = z.infer<typeof ResetPasswordSchema>;
