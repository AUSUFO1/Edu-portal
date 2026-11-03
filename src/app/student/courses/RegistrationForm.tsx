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
                <td>
                  {c.registered ? (
                    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Badge tone="green">Registered</Badge>
                      {open && (
                        // Submits the drop form below with this course (forms cannot be nested inside this one).
                        <button
                          type="submit"
                          form="drop-course"
                          name="offeringId"
                          value={c.offeringId}
                          onClick={(e) => {
                            if (!window.confirm(`Drop ${c.code} – ${c.title}?`)) e.preventDefault();
                          }}
                          className="whitespace-nowrap text-xs font-bold text-danger hover:underline"
                        >
                          Drop
                        </button>
                      )}
                    </span>
                  ) : (
                    <span className="text-ink/45">Not registered</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        {open && (
          <div className="mt-5 flex justify-end">
            <SubmitButton disabled={selectedCourses.length === 0}>
              {selectedCourses.length ? `Register ${selectedCourses.length} course${selectedCourses.length > 1 ? 's' : ''}` : 'Select courses to register'}
            </SubmitButton>
          </div>
        )}
      </ActionForm>

      {/* Shared drop form: each Drop button above posts its own course ID here; the outcome shows below. */}
      {open && <ActionForm id="drop-course" action={dropCourseAction} className="mt-2">{null}</ActionForm>}
    </>
  );
}
