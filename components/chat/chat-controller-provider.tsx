'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { useChatController, type ChatController } from '@/components/chat/use-chat-controller';

import type { ChatMessage } from '@/lib/chat-session-store';

interface ChatControllerProviderProps {
  children: ReactNode;
  initialMessages: ChatMessage[];
}

const ChatControllerContext = createContext<ChatController | null>(null);

export function ChatControllerProvider({ children, initialMessages }: ChatControllerProviderProps) {
  const controller = useChatController({ initialMessages });

  return (
    <ChatControllerContext.Provider value={controller}>{children}</ChatControllerContext.Provider>
  );
}

export function useChatControllerContext(): ChatController {
  const context = useContext(ChatControllerContext);

  if (!context) {
    throw new Error('useChatControllerContext must be used within ChatControllerProvider.');
  }

  return context;
}
