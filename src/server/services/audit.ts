import type { Executor } from '../db/client';
import { auditLogs } from '../db/schema';

export interface AuditEntry {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}

/**
 * Records an action. Call it with the same transaction as the change it describes, so the
 * change and its audit entry are committed (or rolled back) together.
 */
export async function recordAudit(executor: Executor, entry: AuditEntry) {
  await executor.insert(auditLogs).values({
    actorId: entry.actorId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    details: entry.details ?? {},
    ipAddress: entry.ipAddress ?? null,
  });
}
