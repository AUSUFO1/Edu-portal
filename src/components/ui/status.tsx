import { SHEET_STATUS_LABEL, type SheetStatus } from '@/domain/result-sheet';
import { Badge } from './primitives';

const tone = { draft: 'neutral', submitted: 'gold', approved: 'green', rejected: 'red' } as const;

export function SheetStatusBadge({ status }: { status: SheetStatus | null }) {
  if (!status) return <Badge>Not started</Badge>;
  return <Badge tone={tone[status]}>{SHEET_STATUS_LABEL[status]}</Badge>;
}

export function AccountStatusBadge({ status }: { status: 'active' | 'suspended' | 'deactivated' }) {
  return <Badge tone={status === 'active' ? 'green' : status === 'suspended' ? 'gold' : 'red'}>{status[0]!.toUpperCase() + status.slice(1)}</Badge>;
}
