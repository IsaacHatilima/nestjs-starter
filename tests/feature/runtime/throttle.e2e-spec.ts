import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ErrorCode } from '@/common/errors/error-codes';
import { HealthController } from '@/health/health.controller';
import { createRuntimeApp } from '@tests/setup/runtime-app';

@Controller('throttle-probe')
class ThrottleProbeController {
  @Get()
  handle(): { status: 'ok' } {
    return { status: 'ok' };
  }
}

describe('ThrottlerGuard HTTP behavior (e2e, no database)', () => {
  let app: INestApplication<App>;
  beforeAll(async () => {
    app = await createRuntimeApp(
      {
        imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 2 }])],
        controllers: [ThrottleProbeController, HealthController],
        providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
      },
      { TRUST_PROXY: true },
    );
  });
  afterAll(async () => app.close());

  it('returns the stable 429 envelope and Retry-After once a client exceeds the limit', async () => {
    const http = (): request.Agent => request(app.getHttpServer());
    for (let index = 0; index < 2; index += 1) {
      await http().get('/throttle-probe').set('X-Forwarded-For', '203.0.113.20').expect(200);
    }
    const response = await http().get('/throttle-probe').set('X-Forwarded-For', '203.0.113.20').expect(429);

    expect(response.body).toEqual({
      success: false,
      data: null,
      error: { code: ErrorCode.RATE_LIMITED, message: 'Too many requests' },
    });
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
    await http().get('/throttle-probe').set('X-Forwarded-For', '203.0.113.21').expect(200);
  });

  it('keeps liveness available to repeated probes', async () => {
    for (let index = 0; index < 3; index += 1) {
      await request(app.getHttpServer()).get('/health').expect(200);
    }
  });
});
