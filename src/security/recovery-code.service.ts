import { Injectable } from '@nestjs/common';
import { createHash, randomInt } from 'node:crypto';

/** Lower-case alphanumerics without the ambiguous characters 0, 1, i, l, o. */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const SEGMENT_LENGTH = 5;
const DEFAULT_COUNT = 10;

export interface RecoveryCodeSet {
  codes: readonly string[];
  hashes: readonly string[];
}

function segment(): string {
  return Array.from({ length: SEGMENT_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
}

function normalize(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]/g, '');
}

@Injectable()
export class RecoveryCodeService {
  generate(count: number = DEFAULT_COUNT): RecoveryCodeSet {
    const unique = new Set<string>();
    // Collisions are astronomically unlikely, but a Set keeps the guarantee explicit.
    while (unique.size < count) unique.add(`${segment()}-${segment()}`);
    const codes = [...unique];
    return { codes, hashes: codes.map((code) => this.hash(code)) };
  }

  hash(code: string): string {
    return createHash('sha256').update(normalize(code)).digest('hex');
  }
}
