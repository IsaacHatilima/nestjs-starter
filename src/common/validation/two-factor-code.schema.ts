import { z } from 'zod';

/** A 6-digit authenticator code or an `xxxxx-xxxxx` recovery code. */
export const TwoFactorCodeSchema = z.string().trim().min(6).max(16);
