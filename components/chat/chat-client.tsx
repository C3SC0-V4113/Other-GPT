'use client';

import { ChatComposerForm } from '@/components/chat/chat-composer-form';
import { ChatComposerProvider } from '@/components/chat/chat-composer-provider';
import { ChatProvider } from '@/components/chat/chat-controller-provider';
import { ChatMessagesView } from '@/components/chat/chat-messages-view';
import { TooltipProvider } from '@/components/ui/tooltip';

import type { ChatAttachment } from '@/lib/chat-attachments';
import type { ChatMessage } from '@/lib/chat-session-store';
import type { ReactNode } from 'react';

interface ChatClientProps {
  children: ReactNode;
  canGenerateImages: boolean;
  initialAttachments: ChatAttachment[];
  initialMessages: ChatMessage[];
}

export function ChatClient({
  children,
  canGenerateImages,
  initialAttachments,
  initialMessages,
}: ChatClientProps) {
  return (
    <ChatProvider initialAttachments={initialAttachments} initialMessages={initialMessages}>
      <TooltipProvider>
        <div className="flex min-h-0 flex-1 flex-col">
          {children}

          <ChatMessagesView />

          <div className="border-t bg-background/95">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 p-4">
              <ChatComposerProvider>
                <ChatComposerForm canGenerateImages={canGenerateImages} />
              </ChatComposerProvider>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </ChatProvider>
  );
}
