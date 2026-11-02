import { sql } from 'drizzle-orm';
import { getDb } from '@/server/db/client';

export const dynamic = 'force-dynamic';

/** Liveness and database connectivity check for uptime monitoring. Reveals no data. */
export async function GET() {
  const started = Date.now();
  try {
    const db = await getDb();
    await db.execute(sql`select 1`);
    return Response.json({ status: 'ok', database: 'ok', latencyMs: Date.now() - started });
  } catch (error) {
    console.error('[health] database check failed', error);
    return Response.json({ status: 'degraded', database: 'unreachable' }, { status: 503 });
  }
}
