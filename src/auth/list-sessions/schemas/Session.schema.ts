import { z } from 'zod';

export const SessionSchema = z.object({
  id: z.uuid(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  current: z.boolean().describe('True for the session making this request.'),
  createdAt: z.iso.datetime(),
  lastUsedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
});

export const SessionListSchema = z.array(SessionSchema);
