/** Display helpers. Times are stored in UTC and shown in West Africa Time. */
const TIME_ZONE = 'Africa/Lagos';

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: TIME_ZONE }).format(new Date(value));
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeZone: TIME_ZONE }).format(new Date(value));
}

export const termLabel = (term: 'first' | 'second') => (term === 'first' ? 'First Semester' : 'Second Semester');

export const fullName = (p: { firstName: string; lastName: string; title?: string | null }) => [p.title, p.firstName, p.lastName].filter(Boolean).join(' ');

export const formatScore = (n: number | null | undefined) => (n === null || n === undefined ? '' : Number.isInteger(n) ? String(n) : n.toFixed(1));
