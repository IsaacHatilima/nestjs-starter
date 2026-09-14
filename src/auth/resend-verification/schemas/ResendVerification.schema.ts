import { z } from 'zod';
import { EmailSchema } from '@/common/validation/email.schema';

export const ResendVerificationSchema = z.object({
  email: EmailSchema,
});

export type ResendVerification = z.infer<typeof ResendVerificationSchema>;
