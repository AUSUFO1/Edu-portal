import 'server-only';
import { cache } from 'react';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;
/** A transaction handle; services accept `Database | Transaction` so they compose inside one transaction. */
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
export type Executor = Database | Transaction;

/**
 * Resolves the database for the current request.
 *
 * - On Cloudflare Workers: one postgres.js client per request over the Hyperdrive binding, keyed on
 *   the request's execution context. Workers cannot share sockets between requests and allow at
 *   most 6 open connections per request, so every query in a request must share one small pool;
 *   Hyperdrive keeps the real connection pool to Postgres warm.
 * - Elsewhere with DATABASE_URL: a shared postgres.js pool (migrations, seeding, `next start`).
 * - Otherwise: embedded PGlite in ./.pglite, so the project runs locally with no database install.
 */
export const getDb = cache(async (): Promise<Database> => {
  const cloudflare = await cloudflareRequest();
  if (cloudflare) {
    let db = perRequestDb.get(cloudflare.ctx);
    if (!db) {
      db = createPostgresDb(cloudflare.connectionString, { max: 4 });
      perRequestDb.set(cloudflare.ctx, db);
    }
    return db;
  }
  return createLocalDb();
});

const perRequestDb = new WeakMap<object, Promise<Database>>();

async function cloudflareRequest(): Promise<{ ctx: object; connectionString: string } | null> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const { env, ctx } = getCloudflareContext();
    const connectionString = (env as { HYPERDRIVE?: { connectionString: string } }).HYPERDRIVE?.connectionString;
    return connectionString ? { ctx, connectionString } : null;
  } catch {
    return null; // not running on Cloudflare
  }
}

async function createPostgresDb(url: string, options: { max: number }): Promise<Database> {
  // A single pool is created per request (or per process), never per query.
  const [{ default: postgres }, { drizzle }] = await Promise.all([import('postgres'), import('drizzle-orm/postgres-js')]);
  // fetch_types off: avoids an extra round trip per connection (recommended for Hyperdrive).
  const client = postgres(url, { max: options.max, fetch_types: false, prepare: true });
  return drizzle(client, { schema }) as unknown as Database;
}

const globalForDb = globalThis as unknown as { __uempLocalDb?: Promise<Database> };

function createLocalDb(): Promise<Database> {
  // Kept on globalThis so hot reloads in development reuse one connection.
  globalForDb.__uempLocalDb ??= (async () => {
    if (process.env.DATABASE_URL) return createPostgresDb(process.env.DATABASE_URL, { max: 10 });
    // NODE_ENV is inlined at build time, so the embedded database never ships in a production bundle.
    if (process.env.NODE_ENV === 'production') throw new Error('No database configured: bind HYPERDRIVE or set DATABASE_URL.');
    const { openLocalDatabase } = await import('./local');
    return openLocalDatabase();
  })();
  return globalForDb.__uempLocalDb;
}
