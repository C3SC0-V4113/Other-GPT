'use client';

import { LoaderCircle, LogOut, Settings, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

import { LanguageMenuItems } from '@/components/i18n/language-selector';
import { ThemeModeMenuItems } from '@/components/theme/theme-mode-selector';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type UserMenuProps = {
  email: string;
  displayName?: string | null;
};

export function UserMenu({ email, displayName }: UserMenuProps) {
  const t = useTranslations('auth');
  const tTheme = useTranslations('themeSelector');
  const tLang = useTranslations('languageSelector');
  const { replace, refresh } = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = () => {
    startTransition(async () => {
      try {
        await fetch('/api/chat', { method: 'DELETE' });
      } catch {
        // best-effort — session may already be empty
      }

      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } finally {
        replace('/login');
        refresh();
      }
    });
  };

  return (
    <>
      <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
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
          <DropdownMenuLabel className="max-w-48 truncate">
            {displayName ?? email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings />
              <span>{t('account')}</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{tTheme('label')}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <ThemeModeMenuItems />
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{tLang('label')}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <LanguageMenuItems />
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setIsMenuOpen(false);
              setIsSignOutConfirmOpen(true);
            }}
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <LogOut />
            <span>{t('signOut')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isSignOutConfirmOpen} onOpenChange={setIsSignOutConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('signOutConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('signOutConfirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={() => {
                void handleSignOut();
              }}
            >
              {isPending ? (
                <LoaderCircle
                  data-icon="inline-start"
                  className="animate-spin motion-reduce:animate-none"
                />
              ) : (
                <LogOut />
              )}
              <span>{t('confirmSignOut')}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
