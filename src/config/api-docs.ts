import { type INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import type { Env } from './env.schema';

const DOCS_PATH = 'docs';

/** Swagger is on outside production unless API_DOCS_ENABLED says otherwise. */
export function isApiDocsEnabled(env: Env): boolean {
  return env.API_DOCS_ENABLED ?? env.NODE_ENV !== 'production';
}

/** Mount the same gated Swagger routes in production and every HTTP test application. */
export function setupApiDocs(app: INestApplication, env: Env): void {
  if (!isApiDocsEnabled(env)) return;
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle(`${env.APP_NAME} API`).setVersion('0.0.1').addBearerAuth().build(),
  );
  SwaggerModule.setup(DOCS_PATH, app, cleanupOpenApiDoc(document));
  Logger.log(`API docs at /${DOCS_PATH}`, 'Bootstrap');
}
