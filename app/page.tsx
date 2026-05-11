import { cookies } from 'next/headers';

import { ChatClearSessionButton } from '@/components/chat/chat-clear-session-button';
import { ChatClient } from '@/components/chat/chat-client';
import { ChatHeader } from '@/components/chat/chat-header';
import { CHAT_SESSION_COOKIE_NAME, getSessionMessages } from '@/lib/chat-session-store';

export default async function Home() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(CHAT_SESSION_COOKIE_NAME)?.value;
  const initialMessages = getSessionMessages(sessionId);

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <ChatClient initialMessages={initialMessages}>
        <ChatHeader action={<ChatClearSessionButton />} />
      </ChatClient>
    </div>
  );
}
