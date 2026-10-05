import type { INestApplication, ModuleMetadata } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types';
import { HttpExceptionFilter } from '@/common/http-exception.filter';
import { ResponseEnvelopeInterceptor } from '@/common/response-envelope.interceptor';
import { configureHttpApp } from '@/config/http-app';
import { setupApiDocs } from '@/config/api-docs';
import type { Env } from '@/config/env.schema';
import { testEnv } from './security.fixture';
import { listenOn } from './http-server';

/** A real HTTP app with middleware and envelopes, without importing the database-backed application. */
export async function createRuntimeApp(
  metadata: ModuleMetadata,
  overrides: Partial<Env> = {},
): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    ...metadata,
    providers: [
      ...(metadata.providers ?? []),
      { provide: APP_FILTER, useClass: HttpExceptionFilter },
      { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
    ],
  }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  const env = { ...testEnv, ...overrides };
  configureHttpApp(app, env);
  setupApiDocs(app, env);
  await app.init();
  await listenOn(app);
  return app;
}
