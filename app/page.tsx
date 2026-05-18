import { cookies } from 'next/headers';

import { ChatClearSessionButton } from '@/components/chat/chat-clear-session-button';
import { ChatClient } from '@/components/chat/chat-client';
import { ChatHeader } from '@/components/chat/chat-header';
import { ThemeModeSelector } from '@/components/theme/theme-mode-selector';
import {
  CHAT_SESSION_COOKIE_NAME,
  getSessionAttachments,
  getSessionMessages,
} from '@/lib/chat-session-store';

export default async function Home() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(CHAT_SESSION_COOKIE_NAME)?.value;
  const initialMessages = getSessionMessages(sessionId);
  const initialAttachments = getSessionAttachments(sessionId);

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <ChatClient initialAttachments={initialAttachments} initialMessages={initialMessages}>
        <ChatHeader
          action={
            <div className="flex items-center gap-2">
              <ThemeModeSelector />
              <ChatClearSessionButton />
            </div>
          }
        />
      </ChatClient>
    </div>
  );
}
