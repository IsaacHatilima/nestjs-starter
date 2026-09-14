import { Inject, Injectable } from '@nestjs/common';
import { COMMON_PASSWORDS } from '@/security/common-passwords';
import { PwnedPasswordsClient } from '@/security/pwned-passwords.client';
import type { Env } from '@/config/env.schema';
import { ENV } from '@/config/env.token';

/** Why a password was refused. Callers pass this on, because NIST requires telling the subscriber the reason. */
export type BlocklistReason = 'common' | 'context' | 'breached';

export type BlocklistVerdict = { blocked: false } | { blocked: true; reason: BlocklistReason };

const ALLOWED: BlocklistVerdict = { blocked: false };
const MIN_CONTEXT_TERM_LENGTH = 4;

const lettersOnly = (value: string): string => value.replace(/[^a-z]/g, '');

/**
 * The blocklist NIST SP 800-63B-4 section 3.1.1 requires: a new password is refused when it is commonly used,
 * expected in this context, or known to be compromised. Composition rules stay absent by design; this is what
 * replaces them.
 */
@Injectable()
export class PasswordBlocklist {
  constructor(
    private readonly breaches: PwnedPasswordsClient,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /**
   * `context` holds values that are obvious guesses for this particular user, such as the address signing up. The
   * service name is always included.
   */
  async check(password: string, context: readonly string[] = []): Promise<BlocklistVerdict> {
    const normalized = password.trim().toLowerCase();

    if (this.isCommon(normalized)) return { blocked: true, reason: 'common' };
    if (this.isContextual(normalized, context)) return { blocked: true, reason: 'context' };

    // Only worth a network round trip once the cheap, local checks have passed.
    if (!this.env.PASSWORD_BREACH_CHECK) return ALLOWED;
    const breached = await this.breaches.isBreached(password);
    // A null answer means the lookup failed. Failing open keeps a third-party outage from blocking every signup.
    return breached === true ? { blocked: true, reason: 'breached' } : ALLOWED;
  }

  /**
   * Checks the password and the base it was built from, so the usual dodge of bolting digits or punctuation onto a
   * common word ("Password12345678") is caught along with the word itself.
   */
  private isCommon(normalized: string): boolean {
    const stripped = normalized.replace(/[^a-z0-9]+$/, '');
    return [normalized, stripped, lettersOnly(normalized)].some((variant) => COMMON_PASSWORDS.has(variant));
  }

  /**
   * Matches on the letters alone, so `ZITD!!!!!!!!!!!!` and `ZITDZITDZITDZITD` both reduce to the service name and
   * are refused. Deliberately not a substring match: a term buried inside a real passphrase is not a weak password,
   * and blocking one would be a false positive.
   */
  private isContextual(normalized: string, context: readonly string[]): boolean {
    const letters = lettersOnly(normalized);
    if (!letters) return false;
    const terms = [this.env.APP_NAME, ...context]
      .map((term) => lettersOnly(term.toLowerCase().split('@')[0]))
      .filter((term) => term.length >= MIN_CONTEXT_TERM_LENGTH);
    // Removing every occurrence leaves nothing only when the password is that term, repeated.
    return terms.some((term) => letters.split(term).join('') === '');
  }
}
