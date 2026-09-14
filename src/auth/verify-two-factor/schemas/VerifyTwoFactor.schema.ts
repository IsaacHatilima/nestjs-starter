import { z } from 'zod';
import { TwoFactorCodeSchema } from '@/common/validation/two-factor-code.schema';

export const VerifyTwoFactorSchema = z.object({
  challengeToken: z.string().min(1),
  code: TwoFactorCodeSchema,
});

export type VerifyTwoFactor = z.infer<typeof VerifyTwoFactorSchema>;
