import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as path from 'node:path';
import { Pool } from 'pg';

const MIGRATIONS_FOLDER = path.resolve(__dirname, '../../drizzle');

/** Applies pending SQL migrations from `drizzle/` to the given database. */
export async function runMigrations(connectionString: string): Promise<void> {
  const pool = new Pool({ connectionString });
  try {
    await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await pool.end();
  }
}
