/**
 * Result sheet workflow as an explicit state machine.
 *
 *   draft ──submit──▶ submitted ──approve──▶ approved
 *     ▲                   │                     │
 *     │                 reject                reopen (with reason)
 *     │                   ▼                     │
 *     └──── edit ──── rejected ◀────────────────┘ (reopen returns the sheet to draft)
 */
export type SheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type SheetAction = 'edit' | 'submit' | 'approve' | 'reject' | 'reopen';

const transitions: Record<SheetAction, { from: readonly SheetStatus[]; to: SheetStatus }> = {
  edit: { from: ['draft', 'rejected'], to: 'draft' },
  submit: { from: ['draft', 'rejected'], to: 'submitted' },
  approve: { from: ['submitted'], to: 'approved' },
  reject: { from: ['submitted'], to: 'rejected' },
  reopen: { from: ['approved'], to: 'draft' },
};

export function canPerform(action: SheetAction, status: SheetStatus) {
  return transitions[action].from.includes(status);
}

export function nextStatus(action: SheetAction, status: SheetStatus): SheetStatus {
  if (!canPerform(action, status)) {
    throw new Error(`Cannot ${action} a result sheet that is ${status}.`);
  }
  return transitions[action].to;
}

/** Lecturers may change scores only while the sheet is with them. */
export const isEditableByLecturer = (status: SheetStatus) => canPerform('edit', status);

export const SHEET_STATUS_LABEL: Record<SheetStatus, string> = {
  draft: 'Draft',
  submitted: 'Awaiting approval',
  approved: 'Approved',
  rejected: 'Returned for correction',
};
