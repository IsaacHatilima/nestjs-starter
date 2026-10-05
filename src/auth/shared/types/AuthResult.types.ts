import type { z } from 'zod';
import type {
  AuthenticatedResultSchema,
  LoginResultSchema,
  TokenPairSchema,
  TwoFactorRequiredResultSchema,
} from '@/auth/shared/schemas/AuthResult.schema';

export type TokenPair = z.infer<typeof TokenPairSchema>;
export type AuthenticatedResult = z.infer<typeof AuthenticatedResultSchema>;
export type TwoFactorRequiredResult = z.infer<typeof TwoFactorRequiredResultSchema>;
export type LoginResult = z.infer<typeof LoginResultSchema>;

export interface SessionInput {
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  ip: string | null;
  userAgent: string | null;
}
