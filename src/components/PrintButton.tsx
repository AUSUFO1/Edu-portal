'use client';

import { PrinterIcon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/ui/icon';

export function PrintButton() {
  return (
    <button type="button" className="btn btn-primary" onClick={() => window.print()}>
      <Icon icon={PrinterIcon} size={16} /> Print or save as PDF
    </button>
  );
}
