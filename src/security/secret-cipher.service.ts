import { Inject, Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { Env } from '@/config/env.schema';
import { ENV } from '@/config/env.token';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const SEGMENTS = 3;

/** Encrypts TOTP seeds and queued mail at rest with AES-256-GCM. Payload: `iv.tag.ciphertext` in base64url. */
@Injectable()
export class SecretCipher {
  private readonly key: Buffer;

  constructor(@Inject(ENV) env: Env) {
    this.key = Buffer.from(env.TWO_FACTOR_ENCRYPTION_KEY, 'hex');
  }

  encrypt(plain: string): string {
    // A fresh nonce per call, so equal secrets never produce equal ciphertexts.
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), body].map((part) => part.toString('base64url')).join('.');
  }

  decrypt(payload: string): string {
    const parts = payload.split('.');
    if (parts.length !== SEGMENTS) throw new Error('Malformed encrypted secret');
    const [iv, tag, body] = parts.map((part) => Buffer.from(part, 'base64url'));
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
  }
}
