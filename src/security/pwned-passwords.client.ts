import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Env } from '@/config/env.schema';
import { ENV } from '@/config/env.token';

const RANGE_ENDPOINT = 'https://api.pwnedpasswords.com/range';
const PREFIX_LENGTH = 5;

/**
 * Asks Have I Been Pwned whether a password appears in a known breach, using its k-anonymity range API: only the
 * first five characters of the SHA-1 hash ever leave this server, so neither the password nor its full hash is
 * disclosed, and the response covers hundreds of hashes that share that prefix.
 *
 * SHA-1 is not a security choice here; it is the digest the published range API indexes on.
 */
@Injectable()
export class PwnedPasswordsClient {
  private readonly logger = new Logger(PwnedPasswordsClient.name);

  constructor(@Inject(ENV) private readonly env: Env) {}

  /** True when breached, false when clean, null when the answer could not be obtained. */
  async isBreached(password: string): Promise<boolean | null> {
    const hash = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
    const prefix = hash.slice(0, PREFIX_LENGTH);
    const suffix = hash.slice(PREFIX_LENGTH);

    try {
      const response = await fetch(`${RANGE_ENDPOINT}/${prefix}`, {
        // Padding makes every response a similar size, so its length leaks nothing about the prefix.
        headers: { 'Add-Padding': 'true', 'User-Agent': 'zitd-api' },
        signal: AbortSignal.timeout(this.env.PASSWORD_BREACH_TIMEOUT_MS),
      });
      if (!response.ok) {
        this.logger.warn(`Breach lookup refused with status ${response.status}`);
        return null;
      }
      return this.contains(await response.text(), suffix);
    } catch (error) {
      this.logger.warn(`Breach lookup failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /** Each line is `SUFFIX:COUNT`; the padded decoys carry a count of zero and must not count as a hit. */
  private contains(body: string, suffix: string): boolean {
    return body.split('\n').some((line) => {
      const [candidate, count] = line.trim().split(':');
      return candidate === suffix && Number(count) > 0;
    });
  }
}
