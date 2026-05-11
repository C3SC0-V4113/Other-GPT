import { cookies } from 'next/headers';

import { ChatClient } from '@/components/chat/chat-client';
import { CHAT_SESSION_COOKIE_NAME, getSessionMessages } from '@/lib/chat-session-store';

export default async function Home() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(CHAT_SESSION_COOKIE_NAME)?.value;
  const initialMessages = getSessionMessages(sessionId);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatClient initialMessages={initialMessages} />
    </div>
  );
}
