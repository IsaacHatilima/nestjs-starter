import { ErrorCode } from '@/common/errors/error-codes';
import { profile, SESSION_ID, USER_ID } from '@tests/setup/user.fixture';
import { UpdateProfileRepository } from '@/profile/update-profile/repositories/UpdateProfile.repository';
import { UpdateProfileService } from '@/profile/update-profile/services/UpdateProfile.service';

const auth = { userId: USER_ID, sessionId: SESSION_ID };

function build(result: unknown = profile()) {
  const repository = { update: jest.fn().mockResolvedValue(result) };
  const service = new UpdateProfileService(repository as unknown as UpdateProfileRepository);
  return { repository, service };
}

describe('UpdateProfileService', () => {
  it('applies the change to the caller and returns the updated profile', async () => {
    const updated = profile({ firstName: 'Grace' });
    const { repository, service } = build(updated);

    await expect(service.handle(auth, { firstName: 'Grace' })).resolves.toEqual(updated);
    expect(repository.update).toHaveBeenCalledWith(USER_ID, { firstName: 'Grace' });
  });

  it('passes only the fields it was given, so an absent one is left alone', async () => {
    const { repository, service } = build();

    await service.handle(auth, { avatarUrl: 'https://cdn.example.com/a.png' });

    expect(repository.update).toHaveBeenCalledWith(USER_ID, {
      avatarUrl: 'https://cdn.example.com/a.png',
    });
  });

  it('forwards a null avatar, which clears it', async () => {
    const { repository, service } = build(profile({ avatarUrl: null }));

    await service.handle(auth, { avatarUrl: null });

    expect(repository.update).toHaveBeenCalledWith(USER_ID, { avatarUrl: null });
  });

  it('never updates anyone but the caller', async () => {
    const { repository, service } = build();

    await service.handle({ userId: 'someone-else', sessionId: SESSION_ID }, { lastName: 'Hopper' });

    expect(repository.update).toHaveBeenCalledWith('someone-else', { lastName: 'Hopper' });
  });

  it('reports a missing profile as not found', async () => {
    const { service } = build(null);

    await expect(service.handle(auth, { firstName: 'Grace' })).rejects.toMatchObject({
      code: ErrorCode.NOT_FOUND,
    });
  });
});
