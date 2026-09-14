import { z } from 'zod';
import { ExistingPasswordSchema } from '@/common/validation/password.schema';
import { TwoFactorCodeSchema } from '@/common/validation/two-factor-code.schema';

export const DisableTotpSchema = z.object({
  password: ExistingPasswordSchema,
  code: TwoFactorCodeSchema,
});

export type DisableTotp = z.infer<typeof DisableTotpSchema>;
