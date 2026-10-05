import { z } from 'zod';
import { UserSchema } from './User.schema';

export const TokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const AuthenticatedResultSchema = TokenPairSchema.extend({
  status: z.literal('authenticated'),
  user: UserSchema,
});

export const TwoFactorRequiredResultSchema = z.object({
  status: z.literal('two_factor_required'),
  challengeToken: z.string(),
});

/** A challenge carries no session tokens; clients branch on the status literal. */
export const LoginResultSchema = z.discriminatedUnion('status', [
  AuthenticatedResultSchema,
  TwoFactorRequiredResultSchema,
]);
