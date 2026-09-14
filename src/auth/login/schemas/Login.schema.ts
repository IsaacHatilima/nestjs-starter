import { z } from 'zod';
import { EmailSchema } from '@/common/validation/email.schema';
import { ExistingPasswordSchema } from '@/common/validation/password.schema';

export const LoginSchema = z.object({
  email: EmailSchema,
  password: ExistingPasswordSchema,
});

export type Login = z.infer<typeof LoginSchema>;
