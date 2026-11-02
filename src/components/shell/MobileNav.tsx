'use client';

import { Cancel01Icon, Menu01Icon } from '@hugeicons/core-free-icons';
import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import type { NavItem } from './nav';
import { NavLinks } from './NavLinks';

export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button type="button" className="grid size-10 place-items-center rounded-full text-cream hover:bg-white/10" aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((v) => !v)}>
        <Icon icon={open ? Cancel01Icon : Menu01Icon} size={22} />
      </button>
      {open && (
        <nav className="absolute inset-x-0 top-full z-40 border-t border-white/10 bg-navy px-4 pb-4 pt-2 shadow-xl" aria-label="Main">
          <NavLinks items={items} onNavigate={() => setOpen(false)} />
        </nav>
      )}
    </div>
  );
}
