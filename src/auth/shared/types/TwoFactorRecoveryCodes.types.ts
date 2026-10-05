import type { z } from 'zod';
import type { TwoFactorRecoveryCodesSchema } from '@/auth/shared/schemas/TwoFactorRecoveryCodes.schema';

/** Plain recovery codes, returned exactly once; only their hashes are stored. */
export type TwoFactorRecoveryCodes = z.infer<typeof TwoFactorRecoveryCodesSchema>;
