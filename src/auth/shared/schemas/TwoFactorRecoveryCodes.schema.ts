import { z } from 'zod';

/** Plain recovery codes are exposed once; subsequent reads cannot recover them. */
export const TwoFactorRecoveryCodesSchema = z.object({
  recoveryCodes: z.array(z.string()).readonly(),
});
