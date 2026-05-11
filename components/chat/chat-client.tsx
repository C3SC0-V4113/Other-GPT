'use client';

import { ChatComposerForm } from '@/components/chat/chat-composer-form';
import { ChatControllerProvider } from '@/components/chat/chat-controller-provider';
import { ChatMessagesView } from '@/components/chat/chat-messages-view';

import type { ChatMessage } from '@/lib/chat-session-store';
import type { ReactNode } from 'react';

interface ChatClientProps {
  children: ReactNode;
  initialMessages: ChatMessage[];
}

export function ChatClient({ children, initialMessages }: ChatClientProps) {
  return (
    <ChatControllerProvider initialMessages={initialMessages}>
      <div className="flex min-h-0 flex-1 flex-col">
        {children}

        <ChatMessagesView />

        <div className="border-t bg-background/95">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-4 py-4">
            <ChatComposerForm />
          </div>
        </div>
      </div>
    </ChatControllerProvider>
  );
}
