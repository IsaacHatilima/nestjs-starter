// Jest loads globalSetup outside its module registry, so `moduleNameMapper` (and the @/ alias
// with it) does not apply here. This is the one file that must import src with a relative path.
import { runMigrations } from '../../src/database/migrate';

/** Jest global setup: bring the test database up to date before any suite runs. */
export default async function globalSetup(): Promise<void> {
  process.loadEnvFile('.env.test');
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing from .env.test');
  await runMigrations(url);
}
