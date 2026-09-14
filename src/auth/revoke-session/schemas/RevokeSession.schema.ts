import { z } from 'zod';

export const RevokeSessionSchema = z.object({
  sessionId: z.uuid(),
});

export type RevokeSession = z.infer<typeof RevokeSessionSchema>;
