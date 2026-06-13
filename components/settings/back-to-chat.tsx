'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function BackToChat() {
  const t = useTranslations('settings');

  return (
    <Link
      href="/"
      className="group inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-100 ease-out hover:text-foreground motion-reduce:transition-none"
    >
      <span className="transition-transform duration-100 ease-out group-hover:-translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
        <ArrowLeft className="size-4" />
      </span>
      <span>{t('backToChat')}</span>
    </Link>
  );
}
