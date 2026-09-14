import { Env } from '@/config/env.schema';
import { SecretCipher } from '@/security/secret-cipher.service';

const env = { TWO_FACTOR_ENCRYPTION_KEY: 'ab'.repeat(32) } as Env;

describe('SecretCipher', () => {
  const cipher = new SecretCipher(env);

  it('round-trips a secret', () => {
    const encrypted = cipher.encrypt('JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP');

    expect(cipher.decrypt(encrypted)).toBe('JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP');
  });

  it('never stores the plaintext and uses a fresh nonce every time', () => {
    const first = cipher.encrypt('secret');
    const second = cipher.encrypt('secret');

    expect(first).not.toContain('secret');
    expect(first).not.toBe(second);
  });

  it('rejects ciphertext that was tampered with', () => {
    const encrypted = cipher.encrypt('secret');
    const [iv, tag, body] = encrypted.split('.');
    const flipped = body[0] === 'A' ? 'B' : 'A';

    expect(() => cipher.decrypt(`${iv}.${tag}.${flipped}${body.slice(1)}`)).toThrow();
  });

  it('rejects a malformed payload', () => {
    expect(() => cipher.decrypt('garbage')).toThrow(/malformed/i);
  });
});
