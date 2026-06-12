'use client';

import { CircleUserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

const SECTIONS = [
  { href: '/settings/account', icon: CircleUserRound, labelKey: 'navAccount' },
] as const;

export function SettingsNav() {
  const t = useTranslations('settings');
  const pathname = usePathname();

  return (
    <nav aria-label={t('title')} className="flex flex-col gap-1">
      {SECTIONS.map(({ href, icon: Icon, labelKey }) => {
        const isActive = pathname === href;

        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-2xl px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            )}
          >
            <Icon className="size-4" />
            <span>{t(labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
