import type { INestApplication } from '@nestjs/common';
import type { Request, RequestHandler, Response } from 'express';
import { configureHttpApp } from '@/config/http-app';
import { securityServices } from '@tests/setup/security.fixture';

describe('configureHttpApp', () => {
  const { env } = securityServices();

  function build() {
    const express = { set: jest.fn() };
    const app = {
      use: jest.fn<void, [RequestHandler]>(),
      enableCors: jest.fn(),
      getHttpAdapter: () => ({ getInstance: () => express }),
    };
    return { app, express };
  }

  it('installs headers before CORS and parses the allowed origins', () => {
    const { app, express } = build();
    configureHttpApp(app as unknown as INestApplication, {
      ...env,
      CORS_ORIGIN: 'https://first.example, https://second.example',
      TRUST_PROXY: true,
    });

    expect(app.use).toHaveBeenCalledWith(expect.any(Function));
    expect(app.use.mock.invocationCallOrder[0]).toBeLessThan(app.enableCors.mock.invocationCallOrder[0]);
    expect(app.enableCors).toHaveBeenCalledWith({
      origin: ['https://first.example', 'https://second.example'],
      credentials: true,
    });
    expect(express.set).toHaveBeenCalledWith('trust proxy', 1);
  });

  it('keeps proxy headers untrusted when the deployment has not opted in', () => {
    const { app, express } = build();
    configureHttpApp(app as unknown as INestApplication, { ...env, TRUST_PROXY: false });

    expect(express.set).not.toHaveBeenCalled();
  });

  it.each(['development', 'test'] as const)('keeps HTTP usable under NODE_ENV=%s', (nodeEnv) => {
    const headers = securityHeaders(nodeEnv);
    expect(headers.get('Content-Security-Policy')).not.toContain('upgrade-insecure-requests');
    expect(headers.has('Strict-Transport-Security')).toBe(false);
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('keeps HTTPS upgrades and transport security enabled in production', () => {
    const headers = securityHeaders('production');
    expect(headers.get('Content-Security-Policy')).toContain('upgrade-insecure-requests');
    expect(headers.get('Strict-Transport-Security')).toContain('includeSubDomains');
  });

  function securityHeaders(nodeEnv: 'development' | 'test' | 'production'): Map<string, string> {
    const { app } = build();
    configureHttpApp(app as unknown as INestApplication, { ...env, NODE_ENV: nodeEnv });
    const middleware = app.use.mock.calls[0][0];
    const headers = new Map<string, string>();
    const response = {
      setHeader: (name: string, value: string): void => void headers.set(name, value),
      removeHeader: (name: string): void => void headers.delete(name),
    };
    middleware({ headers: {} } as Request, response as unknown as Response, jest.fn());
    return headers;
  }
});
