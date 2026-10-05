import type { INestApplication } from '@nestjs/common';
import type { Application } from 'express';
import helmet from 'helmet';
import type { Env } from './env.schema';

/** Shared by the production bootstrap and HTTP tests, before routes or Swagger are mounted. */
export function configureHttpApp(app: INestApplication, env: Env): void {
  const production = env.NODE_ENV === 'production';
  app.use(
    helmet({
      // Keep local HTTP tools usable; Safari upgrades localhost when this directive is present.
      contentSecurityPolicy: { directives: { upgradeInsecureRequests: production ? [] : null } },
      strictTransportSecurity: production,
    }),
  );
  app.enableCors({
    origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    credentials: true,
  });
  // The deployment must overwrite forwarded headers when proxy trust is enabled.
  if (env.TRUST_PROXY) {
    const express = app.getHttpAdapter().getInstance() as Application;
    express.set('trust proxy', 1);
  }
}
