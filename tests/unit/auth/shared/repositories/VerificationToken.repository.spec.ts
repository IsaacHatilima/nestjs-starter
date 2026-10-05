import { VerificationTokenRepository } from '@/auth/shared/repositories/VerificationToken.repository';
import type { Database } from '@/database/database.tokens';
import { USER_ID } from '@tests/setup/user.fixture';

describe('VerificationTokenRepository transaction boundary', () => {
  it('rejects a pool executor before issuing any replacement SQL', async () => {
    const db = { execute: jest.fn(), delete: jest.fn(), insert: jest.fn() };
    const repository = new VerificationTokenRepository(db as unknown as Database);
    const input = {
      userId: USER_ID,
      purpose: 'password_reset' as const,
      tokenHash: 'hashed-token',
      expiresAt: new Date(Date.now() + 60_000),
    };

    await expect(repository.replace(input)).rejects.toThrow('Token replacement requires a flow transaction');
    await expect(repository.replace(input, db as unknown as Database)).rejects.toThrow(
      'Token replacement requires a flow transaction',
    );

    expect(db.execute).not.toHaveBeenCalled();
    expect(db.delete).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });
});
