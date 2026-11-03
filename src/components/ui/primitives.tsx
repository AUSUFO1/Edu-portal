import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
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
    <section className={`card p-4 sm:p-6 ${className}`}>
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
    <div className={`card min-w-0 p-4 sm:p-5 ${tone === 'attention' ? 'border-gold/60' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink/50 sm:text-xs">{label}</p>
        {icon && (
          <span className={`grid size-8 place-items-center rounded-full ${tone === 'attention' ? 'bg-gold/20 text-[#7a5d16]' : 'bg-green/10 text-green'}`}>
            <Icon icon={icon} size={16} />
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-2xl font-bold text-navy sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink/55 sm:text-sm">{hint}</p>}
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
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeTones[tone]}`}>{children}</span>;
}

/**
 * Data table. On phones each row becomes a card and every cell is labelled with its column header
 * (read from <thead>), so no table needs sideways scrolling or per-cell markup at the call site.
 */
export function Table({ children }: { children: ReactNode }) {
  const parts = Children.toArray(children).filter(isValidElement) as ReactElement<{ children?: ReactNode }>[];
  const head = parts.find((p) => p.type === 'thead');
  const labels = head ? headerLabels(head) : [];
  return (
    <div className="overflow-x-auto sm:-mx-6">
      <table className="table table-stack min-w-full">{labels.length ? parts.map((p) => (p.type === 'tbody' ? labelBody(p, labels) : p)) : children}</table>
    </div>
  );
}

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode; className?: string }>(node)) {
    return node.props.className?.includes('sr-only') ? '' : textOf(node.props.children);
  }
  return '';
}

function headerLabels(head: ReactElement<{ children?: ReactNode }>) {
  const row = Children.toArray(head.props.children).find(isValidElement) as ReactElement<{ children?: ReactNode }> | undefined;
  return row ? Children.toArray(row.props.children).filter(isValidElement).map((th) => textOf(th).trim()) : [];
}

function labelBody(body: ReactElement<{ children?: ReactNode }>, labels: string[]) {
  const rows = Children.map(body.props.children, (row) => {
    if (!isValidElement<{ children?: ReactNode }>(row) || row.type !== 'tr') return row;
    let column = 0;
    const cells = Children.map(row.props.children, (cell) => {
      if (!isValidElement(cell)) return cell;
      const label = cell.type === 'td' ? labels[column] ?? '' : '';
      column += 1;
      return cell.type === 'td' ? cloneElement(cell as ReactElement<Record<string, unknown>>, { 'data-label': label }) : cell;
    });
    return cloneElement(row, {}, cells);
  });
  return cloneElement(body, { key: 'tbody' }, rows);
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
