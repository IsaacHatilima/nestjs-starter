import { PasswordHasher } from '@/security/password-hasher.service';

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher();

  it('produces an argon2id hash that verifies the original password', async () => {
    const hash = await hasher.hash('correct horse battery staple');

    expect(hash.startsWith('$argon2id$')).toBe(true);
    await expect(hasher.verify(hash, 'correct horse battery staple')).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hasher.hash('correct horse battery staple');

    await expect(hasher.verify(hash, 'wrong')).resolves.toBe(false);
  });

  it('salts every hash so equal passwords never share a hash', async () => {
    const [first, second] = await Promise.all([hasher.hash('same'), hasher.hash('same')]);

    expect(first).not.toBe(second);
  });

  it('treats a malformed stored hash as a failed verification', async () => {
    await expect(hasher.verify('not-a-hash', 'anything')).resolves.toBe(false);
  });
});
