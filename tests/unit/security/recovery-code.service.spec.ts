import { RecoveryCodeService } from '@/security/recovery-code.service';

describe('RecoveryCodeService', () => {
  const service = new RecoveryCodeService();

  it('generates ten unique human-friendly codes with matching hashes', () => {
    const { codes, hashes } = service.generate();

    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) expect(code).toMatch(/^[a-z0-9]{5}-[a-z0-9]{5}$/);
    expect(hashes).toEqual(codes.map((code) => service.hash(code)));
  });

  it('hashes codes regardless of case, dashes and whitespace', () => {
    expect(service.hash(' ABCDE-FGH12 ')).toBe(service.hash('abcdefgh12'));
  });

  it('produces a sha256 hex digest that does not contain the code', () => {
    const hash = service.hash('abcde-fgh12');

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain('abcde');
  });
});
