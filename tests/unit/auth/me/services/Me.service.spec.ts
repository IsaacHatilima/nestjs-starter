import { ErrorCode } from '@/common/errors/error-codes';
import { publicUser, SESSION_ID, USER_ID } from '@tests/setup/user.fixture';
import { MeRepository } from '@/auth/me/repositories/Me.repository';
import { MeService } from '@/auth/me/services/Me.service';

const auth = { userId: USER_ID, sessionId: SESSION_ID };

describe('MeService', () => {
  it('returns the caller profile', async () => {
    const repository = { findById: jest.fn().mockResolvedValue(publicUser()) };
    const service = new MeService(repository as unknown as MeRepository);

    await expect(service.handle(auth)).resolves.toEqual(publicUser());
    expect(repository.findById).toHaveBeenCalledWith(USER_ID);
  });

  it('reports a deleted user as not found', async () => {
    const repository = { findById: jest.fn().mockResolvedValue(null) };
    const service = new MeService(repository as unknown as MeRepository);

    await expect(service.handle(auth)).rejects.toMatchObject({
      code: ErrorCode.NOT_FOUND,
    });
  });
});
