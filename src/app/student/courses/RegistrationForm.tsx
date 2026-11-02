'use client';

import { useState } from 'react';
import { ActionForm, SubmitButton } from '@/components/ui/form';
import { Badge, Table } from '@/components/ui/primitives';
import { dropCourseAction, registerCoursesAction } from '@/server/actions/student';
import type { AvailableCourse } from '@/server/services/registration.service';

export function RegistrationForm({ courses, registeredUnits, open, maxUnits }: { courses: AvailableCourse[]; registeredUnits: number; open: boolean; maxUnits: number }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Courses that became registered (after a successful submit) drop out of the selection.
  const selectedCourses = courses.filter((c) => selected.has(c.offeringId) && !c.registered);
  const selectedUnits = selectedCourses.reduce((sum, c) => sum + c.units, 0);
  const total = registeredUnits + selectedUnits;
  const over = total > maxUnits;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink/65">
          Registered <strong className="text-navy">{registeredUnits}</strong> units
          {selectedUnits > 0 && (
            <>
              {' '}
              + selected <strong className="text-navy">{selectedUnits}</strong> = <strong className={over ? 'text-danger' : 'text-green'}>{total}</strong>
            </>
          )}{' '}
          / {maxUnits} max
        </p>
        <div className="h-2 w-48 overflow-hidden rounded-full bg-ink/10" aria-hidden>
          <div className={`h-full rounded-full ${over ? 'bg-danger' : 'bg-green'}`} style={{ width: `${Math.min(100, (total / maxUnits) * 100)}%` }} />
        </div>
      </div>

      <ActionForm action={registerCoursesAction} resetOnSuccess>
        <Table>
          <thead>
            <tr>
              <th className="w-10">
                <span className="sr-only">Select</span>
              </th>
              <th>Code</th>
              <th>Title</th>
              <th className="text-right">Units</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.offeringId}>
                <td>
                  {!c.registered && open && (
                    <input
                      type="checkbox"
                      name="offeringIds[]"
                      value={c.offeringId}
                      checked={selected.has(c.offeringId)}
                      onChange={() => toggle(c.offeringId)}
                      className="size-4 accent-[#1d8f5d]"
                      aria-label={`Select ${c.code}`}
                    />
                  )}
                </td>
                <td className="font-semibold">{c.code}</td>
                <td>
                  {c.title}
                  <span className="ml-2 inline-flex gap-1">
                    {c.isCarryOver && <Badge tone="red">Carry-over</Badge>}
                    {!c.isCore && <Badge>Elective</Badge>}
                  </span>
                </td>
                <td className="text-right">{c.units}</td>
                <td>{c.registered ? <Badge tone="green">Registered</Badge> : <span className="text-ink/45">Not registered</span>}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        {open && (
          <div className="mt-5 flex justify-end">
            <SubmitButton>{selectedCourses.length ? `Register ${selectedCourses.length} course${selectedCourses.length > 1 ? 's' : ''}` : 'Register selected'}</SubmitButton>
          </div>
        )}
      </ActionForm>

      {open && courses.some((c) => c.registered) && (
        <div className="mt-6 border-t border-ink/10 pt-5">
          <p className="mb-3 text-sm font-bold text-navy">Drop a course</p>
          <div className="flex flex-wrap gap-2">
            {courses
              .filter((c) => c.registered)
              .map((c) => (
                <ActionForm key={c.offeringId} action={dropCourseAction} confirm={`Drop ${c.code}?`}>
                  <input type="hidden" name="offeringId" value={c.offeringId} />
                  <SubmitButton variant="danger" size="sm">
                    Drop {c.code}
                  </SubmitButton>
                </ActionForm>
              ))}
          </div>
        </div>
      )}
    </>
  );
}
