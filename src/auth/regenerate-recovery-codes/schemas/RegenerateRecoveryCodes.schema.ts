import { z } from 'zod';
import { ExistingPasswordSchema } from '@/common/validation/password.schema';
import { TwoFactorCodeSchema } from '@/common/validation/two-factor-code.schema';

export const RegenerateRecoveryCodesSchema = z.object({
  password: ExistingPasswordSchema,
  code: TwoFactorCodeSchema,
});

export type RegenerateRecoveryCodes = z.infer<typeof RegenerateRecoveryCodesSchema>;
