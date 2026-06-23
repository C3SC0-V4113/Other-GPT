import { redirect } from 'next/navigation';

import { UserMenu } from '@/components/auth/user-menu';
import {
  CallInteractionBoundary,
  CallInteractionLockProvider,
} from '@/components/call-interaction-lock';
import { PrivateHeader } from '@/components/private-header';
import { getCurrentUser } from '@/lib/auth';

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }

  if (!user) {
    redirect('/login');
  }

  return (
    <CallInteractionLockProvider>
      <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
        <CallInteractionBoundary>
          <PrivateHeader
            action={<UserMenu email={user.user.email} displayName={user.user.displayName} />}
          />
        </CallInteractionBoundary>
        {children}
      </div>
    </CallInteractionLockProvider>
  );
}
