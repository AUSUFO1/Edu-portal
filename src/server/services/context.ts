import type { Actor } from '../auth/actor';
import type { Database } from '../db/client';

/** Everything a use case needs, passed in explicitly (dependency injection, easy to test). */
export interface ServiceContext {
  db: Database;
  actor: Actor;
  ipAddress: string | null;
}
