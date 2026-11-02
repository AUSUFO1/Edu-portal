import { describe, expect, it } from 'vitest';
import { computeGpa, degreeClass } from '@/domain/gpa';
import { DEFAULT_GRADE_SCALE, gradeFor, totalScore, validateScale } from '@/domain/grading';
import { checkUnitLoad, MAX_UNITS_PER_SEMESTER } from '@/domain/registration';
import { canPerform, nextStatus } from '@/domain/result-sheet';

describe('grading', () => {
  it.each([
    [100, 'A'],
    [70, 'A'],
    [69, 'B'],
    [50, 'C'],
    [45, 'D'],
    [44, 'E'],
    [40, 'E'],
    [39, 'F'],
    [0, 'F'],
  ])('a total of %i is grade %s', (total, grade) => {
    expect(gradeFor(total).grade).toBe(grade);
  });

  it('rounds half marks to the nearest whole total', () => {
    expect(totalScore(19.5, 50)).toBe(70);
    expect(gradeFor(totalScore(19.5, 50)).grade).toBe('A');
  });

  it('accepts the default scale and rejects gaps', () => {
    expect(validateScale(DEFAULT_GRADE_SCALE)).toBeNull();
    const gap = DEFAULT_GRADE_SCALE.map((b) => (b.grade === 'B' ? { ...b, minScore: 61 } : b));
    expect(validateScale(gap)).toMatch(/gap or overlap/);
  });
});

describe('GPA', () => {
  it('weights grade points by course units', () => {
    // (3x5 + 2x3 + 3x0) / 8 = 21 / 8 = 2.625 -> 2.63
    const result = computeGpa([
      { units: 3, point: 5 },
      { units: 2, point: 3 },
      { units: 3, point: 0 },
    ]);
    expect(result).toEqual({ totalUnits: 8, totalPoints: 21, gpa: 2.63 });
  });

  it('is zero, not NaN, with no courses', () => {
    expect(computeGpa([]).gpa).toBe(0);
  });

  it('maps CGPA to a degree class', () => {
    expect(degreeClass(4.5)).toBe('First Class');
    expect(degreeClass(3.49)).toBe('Second Class Lower');
    expect(degreeClass(0.9)).toBe('Fail');
  });
});

describe('result sheet workflow', () => {
  it('only allows the documented transitions', () => {
    expect(nextStatus('submit', 'draft')).toBe('submitted');
    expect(nextStatus('approve', 'submitted')).toBe('approved');
    expect(nextStatus('reject', 'submitted')).toBe('rejected');
    expect(nextStatus('submit', 'rejected')).toBe('submitted');
    expect(nextStatus('reopen', 'approved')).toBe('draft');
    expect(canPerform('approve', 'draft')).toBe(false);
    expect(canPerform('edit', 'submitted')).toBe(false);
    expect(canPerform('edit', 'approved')).toBe(false);
    expect(() => nextStatus('approve', 'approved')).toThrow();
  });
});

describe('unit load', () => {
  it('allows up to the maximum and refuses beyond it', () => {
    expect(checkUnitLoad(20, MAX_UNITS_PER_SEMESTER - 20)).toBeNull();
    expect(checkUnitLoad(20, MAX_UNITS_PER_SEMESTER - 19)).toMatch(/maximum/);
  });
});
