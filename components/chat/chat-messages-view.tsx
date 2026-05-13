'use client';

import { useEffect, useRef } from 'react';

import * as ChatBubble from '@/components/chat/chat-bubble';
import { useChatControllerContext } from '@/components/chat/chat-controller-provider';
import { ChatMarkdown } from '@/components/chat/chat-markdown';
import { ScrollArea } from '@/components/ui/scroll-area';

const messageStateLabels = {
  error: 'Error',
  interrupted: 'Interrumpido',
  streaming: 'Generando...',
} as const;

export function ChatMessagesView() {
  const { isEmptyState, messages, retryLastFailedPrompt } = useChatControllerContext();
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
            <ChatBubble.Root key={message.id} role={message.role} state={message.status}>
              {message.kind === 'error' ? <ChatBubble.Header>Error</ChatBubble.Header> : null}

              {message.role === 'assistant' || message.role === 'system' ? (
                <ChatBubble.Body className="whitespace-normal">
                  <ChatMarkdown content={message.content} />
                </ChatBubble.Body>
              ) : (
                <ChatBubble.Body>{message.content}</ChatBubble.Body>
              )}

              {message.status === 'streaming' ||
              message.status === 'interrupted' ||
              message.status === 'error' ? (
                <ChatBubble.Footer>
                  <span>{messageStateLabels[message.status]}</span>

                  {message.status === 'interrupted' ||
                  (message.status === 'error' && message.retryPrompt) ? (
                    <ChatBubble.Actions>
                      <ChatBubble.Action
                        variant={message.status === 'error' ? 'destructive' : 'ghost'}
                        onClick={() => {
                          void retryLastFailedPrompt();
                        }}
                      >
                        Reintentar
                      </ChatBubble.Action>
                    </ChatBubble.Actions>
                  ) : null}
                </ChatBubble.Footer>
              ) : null}
            </ChatBubble.Root>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
