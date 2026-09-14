import { z } from 'zod';
import { EmailSchema } from '@/common/validation/email.schema';
import { NameSchema } from '@/common/validation/name.schema';
import { PasswordSchema } from '@/common/validation/password.schema';

export const RegisterSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  firstName: NameSchema,
  lastName: NameSchema,
});

export type Register = z.infer<typeof RegisterSchema>;
