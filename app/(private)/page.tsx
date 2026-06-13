import { cookies } from 'next/headers';

import { ChatClient } from '@/components/chat/chat-client';
import { getCurrentUser } from '@/lib/auth';
import {
  CHAT_SESSION_COOKIE_NAME,
  getSessionAttachments,
  getSessionMessages,
} from '@/lib/chat-session-store';
import { canGenerateImages } from '@/lib/roles';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chat',
  description: 'Main chat interface for otro-GPT.',
};

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(CHAT_SESSION_COOKIE_NAME)?.value;
  const initialMessages = getSessionMessages(sessionId);
  const initialAttachments = getSessionAttachments(sessionId);

  return (
    <ChatClient
      canGenerateImages={canGenerateImages(user)}
      initialAttachments={initialAttachments}
      initialMessages={initialMessages}
    />
  );
}
