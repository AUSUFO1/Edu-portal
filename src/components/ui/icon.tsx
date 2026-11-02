import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';

export type { IconSvgElement };

/** Hugeicons with the portal's default stroke, so every icon has the same weight. */
export function Icon({ icon, size = 18, className }: { icon: IconSvgElement; size?: number; className?: string }) {
  return <HugeiconsIcon icon={icon} size={size} strokeWidth={1.7} color="currentColor" className={className} aria-hidden />;
}
