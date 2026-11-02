/**
 * Database connection for command-line scripts (migrate, seed, reset).
 * Uses DATABASE_URL when set (e.g. Neon), otherwise the embedded PGlite database in ./.pglite.
 */
import path from 'node:path';
import type { Database } from '../src/server/db/client';
import * as schema from '../src/server/db/schema';

const MIGRATIONS = path.join(process.cwd(), 'drizzle');

try {
  process.loadEnvFile('.env');
} catch {
  // no .env file: fall back to the embedded database
}

export async function openScriptDb(): Promise<{ db: Database; migrate: () => Promise<void>; close: () => Promise<void>; label: string }> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const [{ default: postgres }, { drizzle }, { migrate }] = await Promise.all([
      import('postgres'),
      import('drizzle-orm/postgres-js'),
      import('drizzle-orm/postgres-js/migrator'),
    ]);
    const client = postgres(url, { max: 1, onnotice: () => {} });
    const db = drizzle(client, { schema });
    return {
      db: db as unknown as Database,
      migrate: () => migrate(db, { migrationsFolder: MIGRATIONS }),
      close: () => client.end(),
      label: `Postgres (${new URL(url).host})`,
    };
  }
  const [{ PGlite }, { drizzle }, { migrate }] = await Promise.all([
    import('@electric-sql/pglite'),
    import('drizzle-orm/pglite'),
    import('drizzle-orm/pglite/migrator'),
  ]);
  const client = new PGlite(path.join(process.cwd(), '.pglite'));
  const db = drizzle(client, { schema });
  return {
    db: db as unknown as Database,
    migrate: () => migrate(db, { migrationsFolder: MIGRATIONS }),
    close: () => client.close(),
    label: 'embedded PGlite (./.pglite)',
  };
}
