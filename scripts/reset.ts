/** Drops everything, re-applies migrations and seeds demo data. Refuses to run in production. */
import { sql } from 'drizzle-orm';
import { openScriptDb } from './db';
import { seed } from './seed-data';

if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
  console.error('Refusing to reset a production database. Pass --force if you really mean it.');
  process.exit(1);
}

const { db, migrate, close, label } = await openScriptDb();
console.log(`Resetting ${label}…`);
await db.execute(sql`drop schema if exists public cascade`);
await db.execute(sql`drop schema if exists drizzle cascade`);
await db.execute(sql`create schema public`);
await migrate();
await seed(db);
await close();
console.log('Database reset and seeded.');
