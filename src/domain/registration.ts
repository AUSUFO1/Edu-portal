/** Course registration rules that do not need the database. */
export const MAX_UNITS_PER_SEMESTER = 24;
export const MIN_UNITS_PER_SEMESTER = 15;

export const LEVELS = [100, 200, 300, 400, 500, 600, 700] as const;
export type Level = (typeof LEVELS)[number];

export function checkUnitLoad(currentUnits: number, addedUnits: number): string | null {
  const total = currentUnits + addedUnits;
  if (total > MAX_UNITS_PER_SEMESTER) {
    return `That would take you to ${total} units; the maximum per semester is ${MAX_UNITS_PER_SEMESTER}.`;
  }
  return null;
}
