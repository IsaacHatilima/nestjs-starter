import { Inject, Injectable } from '@nestjs/common';
import { Pool, type PoolClient } from 'pg';
import { PG_POOL } from '@/database/database.tokens';

/** One deadline covers waiting for a pool connection and executing the probe. */
export const READINESS_TIMEOUT_MS = 1000;

@Injectable()
export class ReadinessRepository {
  private probe: Promise<boolean> | undefined;

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  handle(): Promise<boolean> {
    // Share one in-flight probe, including a checkout still pending after its response deadline.
    this.probe ??= this.probeDatabase();
    return this.probe;
  }

  private probeDatabase(): Promise<boolean> {
    return new Promise((resolve) => {
      let client: PoolClient | undefined;
      let expired = false;
      const finish = (ready: boolean, discard = false): void => {
        clearTimeout(timer);
        client?.release(discard);
        client = undefined;
        resolve(ready);
      };
      const timer = setTimeout(() => {
        expired = true;
        // A stalled probe must not continue holding one of the application's connections.
        finish(false, true);
      }, READINESS_TIMEOUT_MS);

      void Promise.resolve()
        .then(() => this.pool.connect())
        .then(async (connection) => {
          if (expired) {
            // A pool checkout may finish after the HTTP deadline; return it without running SQL.
            connection.release();
            return;
          }
          client = connection;
          await client.query('select 1');
          finish(true);
        })
        .catch(() => finish(false, true))
        .finally(() => {
          this.probe = undefined;
        });
    });
  }
}
