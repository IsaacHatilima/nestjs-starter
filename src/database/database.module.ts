import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { Env } from '@/config/env.schema';
import { ENV } from '@/config/env.token';
import { DRIZZLE, PG_POOL } from './database.tokens';
import * as schema from './schema';

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: (env: Env) =>
        new Pool({
          connectionString: env.DATABASE_URL,
          max: env.DATABASE_POOL_MAX,
          // Opt-in TLS; hosted Postgres usually needs it, the local DBngin server does not.
          ssl: env.DATABASE_SSL ? { rejectUnauthorized: true } : undefined,
        }),
      inject: [ENV],
    },
    {
      provide: DRIZZLE,
      useFactory: (pool: Pool) => drizzle(pool, { schema }),
      inject: [PG_POOL],
    },
  ],
  exports: [DRIZZLE, PG_POOL],
})
/** Owns the pg pool so connections close on shutdown (see enableShutdownHooks in main.ts). */
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
