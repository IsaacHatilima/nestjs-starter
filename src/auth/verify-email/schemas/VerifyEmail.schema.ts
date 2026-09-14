import { z } from 'zod';

export const VerifyEmailSchema = z.object({
  token: z.string().min(1),
});

export type VerifyEmail = z.infer<typeof VerifyEmailSchema>;
