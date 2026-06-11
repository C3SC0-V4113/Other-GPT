import { LanguageSelector } from '@/components/i18n/language-selector';
import { ThemeModeSelector } from '@/components/theme/theme-mode-selector';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <LanguageSelector />
        <ThemeModeSelector />
      </div>
      <main className="flex min-h-dvh items-center justify-center p-6">{children}</main>
    </>
  );
}
