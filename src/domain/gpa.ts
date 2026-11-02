/**
 * Credit-unit-weighted GPA: sum(units x grade point) / sum(units), to two decimal places.
 * Only approved results are passed in; failed courses (F, 0 points) still count their units.
 */
export interface GradedCourse {
  units: number;
  point: number;
}

export interface GpaSummary {
  totalUnits: number;
  totalPoints: number;
  gpa: number;
}

export function computeGpa(courses: readonly GradedCourse[]): GpaSummary {
  const totalUnits = courses.reduce((sum, c) => sum + c.units, 0);
  const totalPoints = courses.reduce((sum, c) => sum + c.units * c.point, 0);
  const gpa = totalUnits === 0 ? 0 : Math.round((totalPoints / totalUnits) * 100) / 100;
  return { totalUnits, totalPoints, gpa };
}

/** Degree class on the five-point scale. */
export function degreeClass(cgpa: number) {
  if (cgpa >= 4.5) return 'First Class';
  if (cgpa >= 3.5) return 'Second Class Upper';
  if (cgpa >= 2.4) return 'Second Class Lower';
  if (cgpa >= 1.5) return 'Third Class';
  if (cgpa >= 1.0) return 'Pass';
  return 'Fail';
}
