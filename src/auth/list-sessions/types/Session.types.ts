import type { z } from 'zod';
import type { SessionSchema } from '@/auth/list-sessions/schemas/Session.schema';

/** A login session as shown to its owner. */
export type Session = z.infer<typeof SessionSchema>;

/** Repository-level session row with real dates. */
export interface SessionRecord {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
}
