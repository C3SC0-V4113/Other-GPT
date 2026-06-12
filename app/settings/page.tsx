import { DesktopRedirect } from '@/components/settings/desktop-redirect';

// Index: on desktop redirect to the default section (two-pane); on mobile the
// shell shows the section list, so this renders nothing.
export default function SettingsIndexPage() {
  return <DesktopRedirect to="/settings/account" />;
}
