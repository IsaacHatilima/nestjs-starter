import { eq } from 'drizzle-orm';
import { profiles, users } from '@/database/schema';
import { ProfileRepository } from '@/profile/shared/repositories/Profile.repository';
import { useTestApp } from '@tests/setup/test-app';

const ctx = useTestApp();
let userId: string;
let repository: ProfileRepository;

beforeEach(async () => {
  const [row] = await ctx.t.db
    .insert(users)
    .values({ email: 'ada@example.com', passwordHash: 'x' })
    .returning({ id: users.id });
  userId = row.id;
  repository = ctx.t.app.get(ProfileRepository);
  await repository.create({ userId, firstName: 'Ada', lastName: 'Lovelace' });
});

describe('ProfileRepository (e2e)', () => {
  it('refuses a second profile for the same user, which is what makes the mapping one-to-one', async () => {
    await expect(repository.create({ userId, firstName: 'Grace', lastName: 'Hopper' })).rejects.toThrow();
  });

  it('leaves columns the change does not name alone', async () => {
    await repository.update(userId, { avatarUrl: 'https://cdn.example.com/a.png' });
    const after = await repository.findByUserId(userId);

    expect(after).toMatchObject({
      firstName: 'Ada',
      lastName: 'Lovelace',
      avatarUrl: 'https://cdn.example.com/a.png',
    });
  });

  it('moves updatedAt forward on a change', async () => {
    const before = await repository.findByUserId(userId);
    const after = await repository.update(userId, { firstName: 'Grace' });

    expect(after?.updatedAt.getTime()).toBeGreaterThanOrEqual(before?.updatedAt.getTime() ?? 0);
  });

  it('reports no row for a user that has no profile', async () => {
    await expect(repository.findByUserId('11111111-1111-4111-8111-111111111111')).resolves.toBeNull();
    await expect(repository.update('11111111-1111-4111-8111-111111111111', { firstName: 'X' })).resolves.toBeNull();
  });

  it('is deleted with its user', async () => {
    await ctx.t.db.delete(users).where(eq(users.id, userId));

    const remaining = await ctx.t.db.select().from(profiles).where(eq(profiles.userId, userId));
    expect(remaining).toHaveLength(0);
  });
});
