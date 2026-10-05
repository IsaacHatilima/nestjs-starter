import { ErrorCode } from '@/common/errors/error-codes';
import { ReadinessRepository } from '@/health/readiness/repositories/Readiness.repository';
import { bodyOf, useTestApp } from '@tests/setup/test-app';

const ctx = useTestApp();

afterEach(() => jest.restoreAllMocks());

describe('GET /health/readiness (e2e)', () => {
  it('checks PostgreSQL and returns the complete success envelope', async () => {
    const response = await ctx.t.http().get('/health/readiness').expect(200);

    expect(bodyOf(response)).toEqual({ success: true, data: { status: 'ok', database: 'up' }, error: null });
  });

  it('answers 503 on dependency failure while liveness still answers 200', async () => {
    jest.spyOn(ctx.t.app.get(ReadinessRepository), 'handle').mockResolvedValue(false);
    const response = await ctx.t.http().get('/health/readiness').expect(503);

    expect(bodyOf(response)).toEqual({
      success: false,
      data: null,
      error: { code: ErrorCode.SERVICE_UNAVAILABLE, message: 'Service unavailable' },
    });
    await ctx.t.http().get('/health').expect(200);
  });
});
