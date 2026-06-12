import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { LanguageSelector } from '@/components/i18n/language-selector';
import { SettingsNav } from '@/components/settings/settings-nav';
import { SettingsShell } from '@/components/settings/settings-shell';
import { ThemeModeSelector } from '@/components/theme/theme-mode-selector';

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  // The session is gated by the proxy + each section page (authoritative). The
  // layout only composes the responsive shell.
  const t = await getTranslations('settings');

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span>{t('backToChat')}</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSelector />
          <ThemeModeSelector />
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden p-4 lg:p-8">
        <SettingsShell nav={<SettingsNav />}>{children}</SettingsShell>
      </div>
    </div>
  );
}
