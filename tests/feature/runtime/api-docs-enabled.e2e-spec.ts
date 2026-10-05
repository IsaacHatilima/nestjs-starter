import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { HealthController } from '@/health/health.controller';
import { createRuntimeApp } from '@tests/setup/runtime-app';

describe('Production Swagger opt-in (e2e, no database)', () => {
  let app: INestApplication<App>;
  beforeAll(async () => {
    app = await createRuntimeApp(
      { controllers: [HealthController] },
      { NODE_ENV: 'production', API_DOCS_ENABLED: true },
    );
  });
  afterAll(async () => app.close());

  it('serves docs and their assets without relaxing the production CSP', async () => {
    const response = await request(app.getHttpServer()).get('/docs').expect(200);

    expect(response.text).toContain('swagger-ui');
    expect(response.headers['content-security-policy']).toContain("script-src 'self'");
    expect(response.headers['content-security-policy']).toContain('upgrade-insecure-requests');
    await request(app.getHttpServer()).get('/docs/swagger-ui-init.js').expect(200);
    const json = await request(app.getHttpServer()).get('/docs-json').expect(200);
    const document = json.body as { paths: Record<string, unknown> };
    expect(document.paths).toHaveProperty('/health');
  });
});
