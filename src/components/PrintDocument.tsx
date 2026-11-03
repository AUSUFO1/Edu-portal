import { Mortarboard01Icon } from '@hugeicons/core-free-icons';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { UNIVERSITY_NAME } from '@/domain/portals';
import { formatDateTime } from '@/lib/format';
import { PrintButton } from './PrintButton';

/** Letterhead layout for documents students print or save as PDF from the browser. */
export function PrintDocument({ title, subtitle, details, children }: { title: string; subtitle: string; details: [string, ReactNode][]; children: ReactNode }) {
  return (
    <article className="card mx-auto max-w-3xl p-4 sm:p-10 print:max-w-none print:border-0 print:p-0">
      <div className="no-print mb-6 flex justify-end [&>button]:max-sm:w-full">
        <PrintButton />
      </div>
      <header className="flex items-center gap-3 border-b-2 border-navy pb-5 sm:gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-navy text-cream print:border print:border-navy print:bg-white print:text-navy">
          <Icon icon={Mortarboard01Icon} size={26} />
        </span>
        <div className="min-w-0">
          <p className="font-display text-lg font-bold text-navy sm:text-xl">{UNIVERSITY_NAME}</p>
          <p className="text-xs text-ink/60 sm:text-sm">Office of the Registrar · Academic Records</p>
        </div>
      </header>
      <div className="mt-6 text-center">
        <h1 className="text-xl font-bold uppercase tracking-wide text-navy sm:text-2xl">{title}</h1>
        <p className="mt-1 text-sm text-ink/60">{subtitle}</p>
      </div>
      <dl className="mt-6 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 print:grid-cols-2">
        {details.map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <dt className="w-28 shrink-0 text-ink/55 sm:w-36">{label}</dt>
            <dd className="min-w-0 break-words font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6">{children}</div>
      <footer className="mt-10 flex flex-wrap items-end justify-between gap-2 border-t border-ink/15 pt-4 text-xs text-ink/50">
        <span>Generated {formatDateTime(new Date())} (WAT)</span>
        <span>This document is computer generated.</span>
      </footer>
    </article>
  );
}
