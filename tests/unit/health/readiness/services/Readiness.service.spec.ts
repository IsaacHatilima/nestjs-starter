import { ErrorCode } from '@/common/errors/error-codes';
import type { ReadinessRepository } from '@/health/readiness/repositories/Readiness.repository';
import { ReadinessService } from '@/health/readiness/services/Readiness.service';

describe('ReadinessService', () => {
  it('returns the ready state when PostgreSQL responds', async () => {
    const repository = { handle: jest.fn().mockResolvedValue(true) };
    const service = new ReadinessService(repository as unknown as ReadinessRepository);

    await expect(service.handle()).resolves.toEqual({ status: 'ok', database: 'up' });
  });

  it('turns failed dependency checks into the stable 503 application error', async () => {
    const repository = { handle: jest.fn().mockResolvedValue(false) };
    const service = new ReadinessService(repository as unknown as ReadinessRepository);

    await expect(service.handle()).rejects.toMatchObject({
      code: ErrorCode.SERVICE_UNAVAILABLE,
      message: 'Service unavailable',
      status: 503,
    });
  });
});
