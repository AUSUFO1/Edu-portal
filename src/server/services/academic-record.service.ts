import { computeGpa, degreeClass } from '@/domain/gpa';
import type { Executor } from '../db/client';
import { approvedResultsFor } from './result.service';

export interface SemesterRecord {
  semesterId: string;
  sessionName: string;
  term: 'first' | 'second';
  courses: { code: string; title: string; units: number; caScore: number; examScore: number; total: number; grade: string; gradePoint: number }[];
  gpa: number;
  units: number;
  /** CGPA up to and including this semester. */
  cgpa: number;
}

/** Semester-by-semester record with GPA and running CGPA, from approved results only. */
export async function academicRecord(db: Executor, studentId: string) {
  const rows = await approvedResultsFor(db, studentId);
  const semesters: SemesterRecord[] = [];
  const all: { units: number; point: number }[] = [];

  for (const row of rows) {
    let semester = semesters.find((s) => s.semesterId === row.semesterId);
    if (!semester) {
      semester = { semesterId: row.semesterId, sessionName: row.sessionName, term: row.term, courses: [], gpa: 0, units: 0, cgpa: 0 };
      semesters.push(semester);
    }
    semester.courses.push({ ...row, total: Math.round(row.caScore + row.examScore) });
  }

  for (const semester of semesters) {
    const graded = semester.courses.map((c) => ({ units: c.units, point: c.gradePoint }));
    const summary = computeGpa(graded);
    all.push(...graded);
    semester.gpa = summary.gpa;
    semester.units = summary.totalUnits;
    semester.cgpa = computeGpa(all).gpa;
  }

  const overall = computeGpa(all);
  return { semesters, cgpa: overall.gpa, totalUnits: overall.totalUnits, standing: overall.totalUnits ? degreeClass(overall.gpa) : null };
}
