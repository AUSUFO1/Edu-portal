/**
 * A fresh in-memory Postgres (PGlite) per test file, migrated and seeded with the demo data,
 * so integration tests run the real SQL, constraints and triggers without any setup.
 */
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { seed } from '../../scripts/seed-data';
import type { Actor } from '@/server/auth/actor';
import type { Database } from '@/server/db/client';
import * as schema from '@/server/db/schema';
import type { ServiceContext } from '@/server/services/context';

export async function createTestDatabase() {
  const client = new PGlite();
  const db = drizzle(client, { schema }) as unknown as Database;
  await migrate(drizzle(client, { schema }), { migrationsFolder: path.join(process.cwd(), 'drizzle') });
  await seed(db);
  return { db, close: () => client.close() };
}

export async function contextFor(db: Database, email: string): Promise<ServiceContext> {
  const [user] = await db.select().from(schema.users).where(eq(sql`lower(${schema.users.email})`, email.toLowerCase()));
  if (!user) throw new Error(`No user ${email}`);
  const actor: Actor = { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, departmentId: user.departmentId };
  return { db, actor, ipAddress: '127.0.0.1' };
}

export const EMAILS = {
  registrar: 'registrar@uemp.edu.ng',
  hodCsc: 'hod.csc@uemp.edu.ng',
  examsCsc: 'exams.csc@uemp.edu.ng',
  hodMth: 'hod.mth@uemp.edu.ng',
  lecturerCsc201: 'adebayo.ola@uemp.edu.ng',
  lecturerCsc203: 'chioma.nwosu@uemp.edu.ng',
  lecturerCsc205: 'yakubu.sani@uemp.edu.ng',
  lecturerMth: 'tunde.bakare@uemp.edu.ng',
  student200Registered: 'aisha.mohammed@student.uemp.edu.ng',
  student200Unregistered: 'blessing.etim@student.uemp.edu.ng',
  studentWithCarryOver: 'kelechi.uche@student.uemp.edu.ng',
  student100Unregistered: 'samuel.danjuma@student.uemp.edu.ng',
};
