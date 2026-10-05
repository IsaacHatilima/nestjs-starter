import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { HealthController } from '@/health/health.controller';
import { createRuntimeApp } from '@tests/setup/runtime-app';

describe('Production Swagger gating (e2e, no database)', () => {
  let app: INestApplication<App>;
  beforeAll(async () => {
    app = await createRuntimeApp({ controllers: [HealthController] }, { NODE_ENV: 'production' });
  });
  afterAll(async () => app.close());

  it.each(['/docs', '/docs-json', '/docs/swagger-ui-init.js'])('does not mount %s without opt-in', async (path) => {
    await request(app.getHttpServer()).get(path).expect(404);
  });

  it('still applies production transport and content security headers to routes', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expect(response.headers['strict-transport-security']).toContain('includeSubDomains');
    expect(response.headers['content-security-policy']).toContain('upgrade-insecure-requests');
  });
});
