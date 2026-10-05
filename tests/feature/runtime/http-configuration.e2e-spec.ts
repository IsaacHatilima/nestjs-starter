import { Controller, Get, INestApplication, Req } from '@nestjs/common';
import type { Request } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createRuntimeApp } from '@tests/setup/runtime-app';

@Controller('runtime')
class RuntimeController {
  @Get()
  handle(@Req() req: Request): { ip: string | undefined } {
    return { ip: req.ip };
  }
}

describe('HTTP configuration (e2e, no database)', () => {
  let app: INestApplication<App>;
  beforeAll(async () => {
    app = await createRuntimeApp(
      { controllers: [RuntimeController] },
      { CORS_ORIGIN: 'https://allowed.example, https://second.example', TRUST_PROXY: true },
    );
  });
  afterAll(async () => app.close());

  it('sets security headers on route responses', async () => {
    const response = await request(app.getHttpServer()).get('/runtime').expect(200);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    expect(response.headers['content-security-policy']).not.toContain('upgrade-insecure-requests');
    expect(response.headers['strict-transport-security']).toBeUndefined();
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('echoes only configured CORS origins and allows credentials', async () => {
    const response = await request(app.getHttpServer())
      .get('/runtime')
      .set('Origin', 'https://second.example')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBe('https://second.example');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    const denied = await request(app.getHttpServer())
      .get('/runtime')
      .set('Origin', 'https://other.example')
      .expect(200);
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers CORS preflight with security headers before a controller runs', async () => {
    const response = await request(app.getHttpServer())
      .options('/runtime')
      .set('Origin', 'https://allowed.example')
      .set('Access-Control-Request-Method', 'POST')
      .expect(204);

    expect(response.headers['access-control-allow-origin']).toBe('https://allowed.example');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('reads the client IP from forwarded headers when proxy trust is enabled', async () => {
    const response = await request(app.getHttpServer())
      .get('/runtime')
      .set('X-Forwarded-For', '203.0.113.10')
      .expect(200);

    expect(response.body).toEqual({ success: true, data: { ip: '203.0.113.10' }, error: null });
  });

  it('serves Swagger HTML, initialization assets, and the JSON document with the same middleware', async () => {
    const docs = await request(app.getHttpServer()).get('/docs').expect(200);
    expect(docs.text).toContain('swagger-ui');
    expect(docs.headers['x-content-type-options']).toBe('nosniff');
    expect(docs.headers['content-security-policy']).toContain("script-src 'self'");
    expect(docs.headers['content-security-policy']).not.toContain('upgrade-insecure-requests');
    const scripts = [...docs.text.matchAll(/<script\b([^>]*)>/g)];
    expect(scripts.length).toBeGreaterThan(0);
    for (const script of scripts) expect(script[1]).toMatch(/\bsrc=/);
    const initialization = await request(app.getHttpServer()).get('/docs/swagger-ui-init.js').expect(200);
    expect(initialization.text).toContain('window.onload');
    const json = await request(app.getHttpServer()).get('/docs-json').expect(200);
    const document = json.body as { paths: Record<string, unknown> };
    expect(document.paths).toHaveProperty('/runtime');
  });
});
