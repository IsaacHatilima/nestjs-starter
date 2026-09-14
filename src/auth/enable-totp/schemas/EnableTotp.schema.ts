import { z } from 'zod';
import { TwoFactorCodeSchema } from '@/common/validation/two-factor-code.schema';

export const EnableTotpSchema = z.object({
  code: TwoFactorCodeSchema,
});

export type EnableTotp = z.infer<typeof EnableTotpSchema>;
