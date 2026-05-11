'use client';

import { useEffect, useRef } from 'react';

import { useChatControllerContext } from '@/components/chat/chat-controller-provider';
import { ChatMessageBubble } from '@/components/chat/chat-message-bubble';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ChatMessagesView() {
  const { isEmptyState, messages } = useChatControllerContext();
  const scrollAreaRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const viewportElement = scrollAreaRootRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]'
    );

    if (viewportElement instanceof HTMLDivElement) {
      viewportElement.scrollTop = viewportElement.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={scrollAreaRootRef} className="min-h-0 flex-1">
      <ScrollArea className="size-full min-h-0">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6">
          {isEmptyState ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
              Start a conversation by typing your first message below.
            </div>
          ) : null}

          {messages.map((message) => (
            <ChatMessageBubble key={message.id} role={message.role}>
              {message.content}
            </ChatMessageBubble>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
