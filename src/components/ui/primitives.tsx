import type { ReactNode } from 'react';
import { Icon, type IconSvgElement } from './icon';

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.18em] text-green">{eyebrow}</p>}
        <h1 className="mt-1 text-3xl font-bold text-navy sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-ink/65">{description}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Section({ title, description, actions, children, className = '' }: { title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-lg font-bold text-navy">{title}</h2>}
            {description && <p className="mt-1 text-sm text-ink/60">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint, icon, tone = 'default' }: { label: string; value: ReactNode; hint?: string; icon?: IconSvgElement; tone?: 'default' | 'attention' }) {
  return (
    <div className={`card p-5 ${tone === 'attention' ? 'border-gold/60' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/50">{label}</p>
        {icon && (
          <span className={`grid size-8 place-items-center rounded-full ${tone === 'attention' ? 'bg-gold/20 text-[#7a5d16]' : 'bg-green/10 text-green'}`}>
            <Icon icon={icon} size={16} />
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-3xl font-bold text-navy">{value}</p>
      {hint && <p className="mt-1 text-sm text-ink/55">{hint}</p>}
    </div>
  );
}

const badgeTones = {
  neutral: 'bg-ink/[0.06] text-ink/70',
  green: 'bg-green/12 text-green',
  gold: 'bg-gold/20 text-[#7a5d16]',
  red: 'bg-danger/10 text-danger',
  navy: 'bg-navy text-cream',
} as const;

export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof badgeTones; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeTones[tone]}`}>{children}</span>;
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-5 overflow-x-auto sm:-mx-6">
      <table className="table min-w-full">{children}</table>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink/15 px-6 py-10 text-center">
      <p className="font-display text-lg font-bold text-navy">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-ink/60">{description}</p>}
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: ReactNode }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${tone === 'warn' ? 'border-gold/50 bg-gold/10 text-[#6b5214]' : 'border-green/25 bg-green/[0.06] text-navy'}`}>
      {children}
    </div>
  );
}
