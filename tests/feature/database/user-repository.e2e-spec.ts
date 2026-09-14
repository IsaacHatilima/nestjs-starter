import { eq } from 'drizzle-orm';
import { UserRepository } from '@/auth/shared/repositories/User.repository';
import { users } from '@/database/schema';
import { useTestApp } from '@tests/setup/test-app';

const ctx = useTestApp();
let userId: string;
let repository: UserRepository;

beforeEach(async () => {
  const [row] = await ctx.t.db
    .insert(users)
    .values({ email: 'ada@example.com', passwordHash: 'x' })
    .returning({ id: users.id });
  userId = row.id;
  repository = ctx.t.app.get(UserRepository);
});

describe('UserRepository.recordTotpStep (e2e)', () => {
  it('claims a step once and refuses the same or an older step afterwards', async () => {
    await expect(repository.recordTotpStep(userId, 100)).resolves.toBe(true);
    await expect(repository.recordTotpStep(userId, 100)).resolves.toBe(false);
    await expect(repository.recordTotpStep(userId, 99)).resolves.toBe(false);
    await expect(repository.recordTotpStep(userId, 101)).resolves.toBe(true);

    const [row] = await ctx.t.db.select({ step: users.twoFactorLastUsedStep }).from(users).where(eq(users.id, userId));
    expect(row.step).toBe(101);
  });

  it('lets only one of two concurrent claims for the same step through', async () => {
    const results = await Promise.all([repository.recordTotpStep(userId, 200), repository.recordTotpStep(userId, 200)]);

    expect(results.filter(Boolean)).toHaveLength(1);
  });
});
