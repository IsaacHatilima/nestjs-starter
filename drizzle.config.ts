import { defineConfig } from 'drizzle-kit';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

/**
 * Picks the connection string for drizzle-kit. In test mode the `.env.test`
 * file wins so that `NODE_ENV=test pnpm db:migrate` can never touch the
 * development database; otherwise the shell environment wins over `.env`.
 */
function databaseUrl(): string {
  const isTest = process.env.NODE_ENV === 'test';
  const envFile = isTest ? '.env.test' : '.env';
  const fromFile = existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')).DATABASE_URL : undefined;
  const url = isTest ? (fromFile ?? process.env.DATABASE_URL) : (process.env.DATABASE_URL ?? fromFile);
  if (!url) throw new Error(`DATABASE_URL is not set in the environment or ${envFile}`);
  return url;
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema/index.ts',
  out: './drizzle',
  dbCredentials: { url: databaseUrl() },
});
