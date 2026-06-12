'use client';

import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

/**
 * Responsive Settings shell. On `lg+` it is a perpetual two-pane (nav + content);
 * below `lg` it is a drill-down: `/settings` shows the nav (list) and a section
 * route shows the content, one pane at a time. Same routes either way.
 */
export function SettingsShell({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const isIndex = pathname === '/settings';

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 lg:grid lg:grid-cols-[240px_1fr] lg:gap-8">
      <aside className={cn('lg:block', isIndex ? 'block' : 'hidden')}>{nav}</aside>
      <main className={cn('min-w-0 lg:block', isIndex ? 'hidden' : 'block')}>{children}</main>
    </div>
  );
}
