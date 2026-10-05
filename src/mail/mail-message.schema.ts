import { z } from 'zod';

/** Validate decrypted jobs before their payload reaches SMTP. */
export const mailMessageSchema = z.object({
  from: z.string().min(1),
  to: z.email(),
  subject: z.string().min(1),
  text: z.string(),
  html: z.string(),
});

export type MailMessage = z.infer<typeof mailMessageSchema>;
