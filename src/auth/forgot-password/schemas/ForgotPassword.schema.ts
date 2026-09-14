import { z } from 'zod';
import { EmailSchema } from '@/common/validation/email.schema';

export const ForgotPasswordSchema = z.object({
  email: EmailSchema,
});

export type ForgotPassword = z.infer<typeof ForgotPasswordSchema>;
