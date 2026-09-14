import { passwordCompromised } from '@/common/errors/auth-errors';
import type { BlocklistReason, PasswordBlocklist } from '@/security/password-blocklist.service';

/** NIST SP 800-63B-4 section 3.1.1 requires the reason for rejection, not just a refusal. */
const REASONS: Record<BlocklistReason, string> = {
  common: 'This password is one of the most commonly used passwords. Choose a different one.',
  context: 'This password is built from your email address or the service name. Choose a different one.',
  breached: 'This password has appeared in a known data breach. Choose a different one.',
};

/**
 * Runs the blocklist before a new password is stored. Shared by registration, reset and change, so all three refuse
 * the same passwords for the same stated reasons.
 */
export async function assertPasswordUsable(
  blocklist: PasswordBlocklist,
  password: string,
  context: readonly string[] = [],
): Promise<void> {
  const verdict = await blocklist.check(password, context);
  if (verdict.blocked) throw passwordCompromised(REASONS[verdict.reason]);
}
