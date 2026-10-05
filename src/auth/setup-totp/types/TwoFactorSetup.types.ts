import type { z } from 'zod';
import type { TwoFactorSetupSchema } from '@/auth/setup-totp/schemas/TwoFactorSetup.schema';

/** What the dashboard needs to show an enrolment QR code. The secret is shown once. */
export type TwoFactorSetup = z.infer<typeof TwoFactorSetupSchema>;
