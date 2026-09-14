import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE');
export const PG_POOL = Symbol('PG_POOL');

export type Database = NodePgDatabase<typeof schema>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
/** Anything that can run queries: the database itself or an open transaction. */
export type Executor = Database | Transaction;
