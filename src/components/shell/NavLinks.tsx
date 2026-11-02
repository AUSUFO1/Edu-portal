'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import type { NavItem } from './nav';

export function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  // The most specific matching item is active (so "/department" is not active on "/department/results").
  const active = items
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            onClick={onNavigate}
            aria-current={item.href === active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
              item.href === active ? 'bg-cream text-navy' : 'text-cream/75 hover:bg-white/10 hover:text-cream'
            }`}
          >
            <Icon icon={item.icon} size={18} />
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
