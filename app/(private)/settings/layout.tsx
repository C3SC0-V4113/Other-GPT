import { BackToChat } from '@/components/settings/back-to-chat';
import { SettingsNav } from '@/components/settings/settings-nav';
import { SettingsShell } from '@/components/settings/settings-shell';

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 overflow-hidden p-4 lg:p-8">
        <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-col gap-3">
          <BackToChat />
          <SettingsShell nav={<SettingsNav />}>{children}</SettingsShell>
        </div>
      </div>
    </div>
  );
}
