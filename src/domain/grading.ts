/**
 * Grading. The scale is stored in the `grade_scale` table (configurable); this is the default
 * five-point scale used by Nigerian universities, seeded on setup.
 */
export interface GradeBand {
  grade: string;
  minScore: number;
  maxScore: number;
  point: number;
}

export const DEFAULT_GRADE_SCALE: readonly GradeBand[] = [
  { grade: 'A', minScore: 70, maxScore: 100, point: 5 },
  { grade: 'B', minScore: 60, maxScore: 69, point: 4 },
  { grade: 'C', minScore: 50, maxScore: 59, point: 3 },
  { grade: 'D', minScore: 45, maxScore: 49, point: 2 },
  { grade: 'E', minScore: 40, maxScore: 44, point: 1 },
  { grade: 'F', minScore: 0, maxScore: 39, point: 0 },
];

export const CA_MAX = 30;
export const EXAM_MAX = 70;

/** Total score out of 100. Scores may carry halves (e.g. 12.5); the total is rounded half up. */
export function totalScore(ca: number, exam: number) {
  return Math.round(ca + exam);
}

export function gradeFor(total: number, scale: readonly GradeBand[] = DEFAULT_GRADE_SCALE): GradeBand {
  const band = scale.find((b) => total >= b.minScore && total <= b.maxScore);
  if (!band) throw new Error(`Grading scale does not cover a total of ${total}`);
  return band;
}

/** A usable scale covers 0-100 exactly once, with no gaps or overlaps. */
export function validateScale(scale: readonly GradeBand[]): string | null {
  const sorted = [...scale].sort((a, b) => a.minScore - b.minScore);
  if (sorted.length === 0) return 'The scale has no grades.';
  if (sorted[0]!.minScore !== 0) return 'The lowest band must start at 0.';
  if (sorted[sorted.length - 1]!.maxScore !== 100) return 'The highest band must end at 100.';
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.minScore !== sorted[i - 1]!.maxScore + 1) {
      return `Bands ${sorted[i - 1]!.grade} and ${sorted[i]!.grade} leave a gap or overlap.`;
    }
  }
  return null;
}
