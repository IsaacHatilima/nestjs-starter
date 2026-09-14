import { z } from 'zod';

export const MIN_PASSWORD_LENGTH = 15;
export const MAX_PASSWORD_LENGTH = 128;

/**
 * New passwords carry no composition rules, which NIST SP 800-63B-4 section 3.1.1 forbids outright ("SHALL NOT impose
 * other composition rules"). The 15-character minimum is the one that section sets for a password used as a single
 * factor, and the maximum is well above the 64 characters it asks verifiers to permit.
 * https://pages.nist.gov/800-63-4/sp800-63b.html
 *
 * Length is only half the policy. The same section requires a blocklist check, which {@link PasswordBlocklist} does
 * wherever a password is set: registration, reset and change.
 */
export const PasswordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(MAX_PASSWORD_LENGTH);

/** For passwords being checked, not set: anything non-empty. */
export const ExistingPasswordSchema = z.string().min(1).max(MAX_PASSWORD_LENGTH);
