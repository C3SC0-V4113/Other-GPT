'use client';

import { LoaderCircle, LogOut, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';

import { ThemeModeMenuItems } from '@/components/theme/theme-mode-selector';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type UserMenuProps = {
  email: string;
  displayName?: string | null;
};

export function UserMenu({ email, displayName }: UserMenuProps) {
  const t = useTranslations('auth');
  const { replace, refresh } = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } finally {
        replace('/login');
        refresh();
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={t('signedInAs', { email: displayName ?? email })}
          disabled={isPending}
          size="icon-sm"
          type="button"
          variant="outline"
        >
          <UserRound />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="max-w-48 truncate">{displayName ?? email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ThemeModeMenuItems />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isPending}
          onClick={handleSignOut}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          {isPending ? (
            <LoaderCircle
              data-icon="inline-start"
              className="animate-spin motion-reduce:animate-none"
            />
          ) : (
            <LogOut />
          )}
          <span>{t('signOut')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
