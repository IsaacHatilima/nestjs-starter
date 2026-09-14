import type { Env } from './env.schema';

/** Swagger is on outside production unless API_DOCS_ENABLED says otherwise. */
export function isApiDocsEnabled(env: Env): boolean {
  return env.API_DOCS_ENABLED ?? env.NODE_ENV !== 'production';
}
