import { Mortarboard01Icon } from '@hugeicons/core-free-icons';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/icon';
import { formatDateTime } from '@/lib/format';
import { PrintButton } from './PrintButton';

/** Letterhead layout for documents students print or save as PDF from the browser. */
export function PrintDocument({ title, subtitle, details, children }: { title: string; subtitle: string; details: [string, ReactNode][]; children: ReactNode }) {
  return (
    <article className="card mx-auto max-w-3xl p-6 sm:p-10 print:max-w-none print:border-0 print:p-0">
      <div className="no-print mb-6 flex justify-end">
        <PrintButton />
      </div>
      <header className="flex items-center gap-4 border-b-2 border-navy pb-5">
        <span className="grid size-12 place-items-center rounded-2xl bg-navy text-cream print:border print:border-navy print:bg-white print:text-navy">
          <Icon icon={Mortarboard01Icon} size={26} />
        </span>
        <div>
          <p className="font-display text-xl font-bold text-navy">University Education Management Portal</p>
          <p className="text-sm text-ink/60">Office of the Registrar · Academic Records</p>
        </div>
      </header>
      <div className="mt-6 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-wide text-navy">{title}</h1>
        <p className="mt-1 text-sm text-ink/60">{subtitle}</p>
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {details.map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <dt className="w-36 shrink-0 text-ink/55">{label}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6">{children}</div>
      <footer className="mt-10 flex items-end justify-between border-t border-ink/15 pt-4 text-xs text-ink/50">
        <span>Generated {formatDateTime(new Date())} (WAT)</span>
        <span>This document is computer generated.</span>
      </footer>
    </article>
  );
}
