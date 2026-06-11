import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { UserMenu } from '@/components/auth/user-menu';
import { ChatClearSessionButton } from '@/components/chat/chat-clear-session-button';
import { ChatClient } from '@/components/chat/chat-client';
import { ChatHeader } from '@/components/chat/chat-header';
import { getCurrentUser } from '@/lib/auth';
import {
  CHAT_SESSION_COOKIE_NAME,
  getSessionAttachments,
  getSessionMessages,
} from '@/lib/chat-session-store';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chat',
  description: 'Main chat interface for otro-GPT.',
};

export default async function Home() {
  // Authoritative gate: an absent/invalid session (or unreachable API) → login.
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }

  if (!user) {
    redirect('/login');
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(CHAT_SESSION_COOKIE_NAME)?.value;
  const initialMessages = getSessionMessages(sessionId);
  const initialAttachments = getSessionAttachments(sessionId);

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <ChatClient initialAttachments={initialAttachments} initialMessages={initialMessages}>
        <ChatHeader
          action={
            <div className="flex items-center gap-1.5">
              <ChatClearSessionButton />
              <UserMenu email={user.user.email} displayName={user.user.displayName} />
            </div>
          }
        />
      </ChatClient>
    </div>
  );
}
