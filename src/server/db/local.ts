import path from 'node:path';
import type { Database } from './client';
import * as schema from './schema';

/** Embedded Postgres (PGlite) for local development and tests. */
export async function openLocalDatabase(dataDir = path.join(process.cwd(), '.pglite')): Promise<Database> {
  const [{ PGlite }, { drizzle }] = await Promise.all([import('@electric-sql/pglite'), import('drizzle-orm/pglite')]);
  const client = new PGlite(dataDir);
  return drizzle(client, { schema }) as unknown as Database;
}
