import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { setupApiDocs } from './config/api-docs';
import type { Env } from './config/env.schema';
import { ENV } from './config/env.token';
import { configureHttpApp } from './config/http-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const env = app.get<Env>(ENV);

  configureHttpApp(app, env);
  app.enableShutdownHooks();
  setupApiDocs(app, env);

  await app.listen(env.PORT);
  Logger.log(`Listening on http://localhost:${env.PORT}`, 'Bootstrap');
}

bootstrap().catch((error: unknown) => {
  Logger.error('Failed to start', error instanceof Error ? error.stack : String(error), 'Bootstrap');
  process.exit(1);
});
