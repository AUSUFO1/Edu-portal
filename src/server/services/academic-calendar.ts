import { eq } from 'drizzle-orm';
import { AppError } from '@/domain/errors';
import type { Executor } from '../db/client';
import { academicSessions, semesters } from '../db/schema';

export interface CurrentSemester {
  id: string;
  term: 'first' | 'second';
  registrationOpen: boolean;
  sessionId: string;
  sessionName: string;
}

export async function findCurrentSemester(db: Executor): Promise<CurrentSemester | null> {
  const [row] = await db
    .select({
      id: semesters.id,
      term: semesters.term,
      registrationOpen: semesters.registrationOpen,
      sessionId: academicSessions.id,
      sessionName: academicSessions.name,
    })
    .from(semesters)
    .innerJoin(academicSessions, eq(academicSessions.id, semesters.sessionId))
    .where(eq(semesters.isCurrent, true))
    .limit(1);
  return row ?? null;
}

export async function requireCurrentSemester(db: Executor) {
  const semester = await findCurrentSemester(db);
  if (!semester) throw new AppError('CONFLICT', 'No academic semester is currently active.');
  return semester;
}

export const termLabel = (term: 'first' | 'second') => (term === 'first' ? 'First Semester' : 'Second Semester');
