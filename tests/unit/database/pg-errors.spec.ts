import { isUniqueViolation } from '@/database/pg-errors';

describe('isUniqueViolation', () => {
  it('recognises the postgres unique violation code', () => {
    expect(isUniqueViolation({ code: '23505' })).toBe(true);
  });

  it('looks through a wrapping error to the driver cause', () => {
    const wrapped = new Error('query failed', { cause: { code: '23505' } });

    expect(isUniqueViolation(wrapped)).toBe(true);
  });

  it('ignores other codes and non-error values', () => {
    expect(isUniqueViolation({ code: '23503' })).toBe(false);
    expect(isUniqueViolation(new Error('plain'))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation('23505')).toBe(false);
  });
});
