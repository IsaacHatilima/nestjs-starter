import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module';
import { isApiDocsEnabled } from './config/api-docs';
import type { Env } from './config/env.schema';
import { ENV } from './config/env.token';

const DOCS_PATH = 'docs';

// CORS_ORIGIN may list several origins separated by commas.
function corsOrigins(value: string): string[] {
  return value.split(',').map((origin) => origin.trim());
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const env = app.get<Env>(ENV);

  app.enableCors({ origin: corsOrigins(env.CORS_ORIGIN), credentials: true });
  app.enableShutdownHooks();
  // Behind a proxy Express must trust X-Forwarded-* or every session records the proxy address.
  if (env.TRUST_PROXY) app.set('trust proxy', 1);
  // Swagger is opt-out outside production and opt-in inside it.
  if (isApiDocsEnabled(env)) mountApiDocs(app, env);

  await app.listen(env.PORT);
  Logger.log(`Listening on http://localhost:${env.PORT}`, 'Bootstrap');
}

function mountApiDocs(app: NestExpressApplication, env: Env): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle(`${env.APP_NAME} API`).setVersion('0.0.1').addBearerAuth().build(),
  );
  SwaggerModule.setup(DOCS_PATH, app, cleanupOpenApiDoc(document));
  Logger.log(`API docs at /${DOCS_PATH}`, 'Bootstrap');
}

bootstrap().catch((error: unknown) => {
  Logger.error('Failed to start', error instanceof Error ? error.stack : String(error), 'Bootstrap');
  process.exit(1);
});
