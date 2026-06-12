'use client';

import { usePathname } from 'next/navigation';

import { ScrollArea } from '@/components/ui/scroll-area';
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
    <div className="mx-auto flex w-full max-w-5xl flex-1 overflow-hidden lg:grid lg:grid-cols-[240px_1fr]">
      <aside className={cn('w-full min-w-0 lg:min-h-0', isIndex ? 'block' : 'hidden', 'lg:block')}>
        <div className="size-full lg:border-r lg:border-border lg:pr-6">
          <ScrollArea className="size-full">
            <div className="pr-3">{nav}</div>
          </ScrollArea>
        </div>
      </aside>
      <main className={cn('w-full min-w-0 lg:min-h-0', isIndex ? 'hidden' : 'block', 'lg:block')}>
        <div className="size-full lg:pl-6">
          <ScrollArea className="size-full">
            <div className="pr-3">{children}</div>
          </ScrollArea>
        </div>
      </main>
    </div>
  );
}
