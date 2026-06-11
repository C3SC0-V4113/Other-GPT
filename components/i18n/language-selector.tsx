'use client';

import { Check, Languages } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { changeLocaleAction } from '@/i18n/actions';
import { locales } from '@/i18n/config';

import type { Locale } from '@/i18n/config';

const LOCALE_LABEL_KEYS: Record<Locale, 'english' | 'spanish'> = {
  en: 'english',
  es: 'spanish',
};

export function LanguageMenuItems() {
  const t = useTranslations('languageSelector');
  const activeLocale = useLocale() as Locale;
  const { refresh } = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = (nextLocale: Locale) => {
    if (nextLocale === activeLocale) {
      return;
    }

    startTransition(async () => {
      await changeLocaleAction(nextLocale);
      refresh();
    });
  };

  return (
    <>
      <DropdownMenuLabel>{t('label')}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {locales.map((locale) => {
        const isActiveLocale = locale === activeLocale;

        return (
          <DropdownMenuItem
            key={locale}
            disabled={isPending}
            onClick={() => {
              handleLocaleChange(locale);
            }}
          >
            <Languages />
            <span>{t(LOCALE_LABEL_KEYS[locale])}</span>
            {isActiveLocale ? <Check className="ml-auto" /> : null}
          </DropdownMenuItem>
        );
      })}
    </>
  );
}

export function LanguageSelector() {
  const t = useTranslations('languageSelector');
  const activeLocale = useLocale() as Locale;
  const activeLocaleLabel = t(LOCALE_LABEL_KEYS[activeLocale]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={t('ariaLabel')}
          className="w-8 px-0 shadow-sm sm:w-auto sm:px-3"
          size="sm"
          type="button"
          variant="outline"
        >
          <Languages />
          <span className="hidden sm:inline">{activeLocaleLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <LanguageMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
