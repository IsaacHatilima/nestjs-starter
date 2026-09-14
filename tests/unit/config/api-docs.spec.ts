import { isApiDocsEnabled } from '@/config/api-docs';
import type { Env } from '@/config/env.schema';

const env = (overrides: Partial<Env>): Env => overrides as Env;

describe('isApiDocsEnabled', () => {
  it('serves docs outside production by default', () => {
    expect(isApiDocsEnabled(env({ NODE_ENV: 'development' }))).toBe(true);
    expect(isApiDocsEnabled(env({ NODE_ENV: 'test' }))).toBe(true);
  });

  it('hides docs in production by default', () => {
    expect(isApiDocsEnabled(env({ NODE_ENV: 'production' }))).toBe(false);
  });

  it('lets an explicit setting override the default either way', () => {
    expect(isApiDocsEnabled(env({ NODE_ENV: 'production', API_DOCS_ENABLED: true }))).toBe(true);
    expect(isApiDocsEnabled(env({ NODE_ENV: 'development', API_DOCS_ENABLED: false }))).toBe(false);
  });
});
