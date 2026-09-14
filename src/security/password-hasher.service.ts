import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/** OWASP-recommended argon2id parameters: 19 MiB memory, 2 iterations, 1 lane. */
const ARGON2_OPTIONS: argon2.HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class PasswordHasher {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain, ARGON2_OPTIONS);
  }

  /** False for wrong passwords and for malformed hashes alike; nothing about the stored value leaks. */
  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}
