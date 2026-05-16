'use client';

import { Check, Copy, Square, Volume2 } from 'lucide-react';
import Image from 'next/image';
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
  const {
    copiedMessageId,
    isEmptyState,
    messages,
    playMessageAudio,
    playingMessageId,
    retryLastFailedPrompt,
    stopPlayingAudio,
    ttsLoadingMessageId,
    copyMessageText,
  } = useChatControllerContext();
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

          {messages.map((message) => {
            const messageText = message.content.type === 'text' ? message.content.text : null;

            return (
              <ChatBubble.Root key={message.id} role={message.role} state={message.status}>
                {message.kind === 'error' ? <ChatBubble.Header>Error</ChatBubble.Header> : null}

                {message.content.type === 'image' ? (
                  <ChatBubble.Body className="space-y-2 whitespace-normal">
                    <Image
                      src={`data:${message.content.mimeType};base64,${message.content.imageBase64}`}
                      alt={message.content.prompt}
                      width={1024}
                      height={1024}
                      unoptimized
                      className="max-h-[26rem] w-full rounded-xl border border-border object-cover"
                    />
                    <p className="text-xs text-muted-foreground">
                      Prompt: {message.content.prompt}
                    </p>
                  </ChatBubble.Body>
                ) : message.role === 'assistant' || message.role === 'system' ? (
                  <ChatBubble.Body className="whitespace-normal">
                    <ChatMarkdown content={message.content.text} />
                  </ChatBubble.Body>
                ) : (
                  <ChatBubble.Body>{message.content.text}</ChatBubble.Body>
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

                {message.status === 'complete' &&
                message.kind === 'message' &&
                message.role === 'assistant' &&
                messageText ? (
                  <ChatBubble.Footer>
                    <span>Listo</span>
                    <ChatBubble.Actions>
                      <ChatBubble.Action
                        variant={playingMessageId === message.id ? 'secondary' : 'ghost'}
                        onClick={() => {
                          if (playingMessageId === message.id) {
                            stopPlayingAudio();
                            return;
                          }

                          void playMessageAudio(message.id, messageText);
                        }}
                      >
                        {ttsLoadingMessageId === message.id ? (
                          'Cargando...'
                        ) : playingMessageId === message.id ? (
                          <>
                            <Square data-icon="inline-start" />
                            Detener
                          </>
                        ) : (
                          <>
                            <Volume2 data-icon="inline-start" />
                            Escuchar
                          </>
                        )}
                      </ChatBubble.Action>

                      <ChatBubble.Action
                        variant={copiedMessageId === message.id ? 'secondary' : 'ghost'}
                        onClick={() => {
                          void copyMessageText(message.id, messageText);
                        }}
                      >
                        {copiedMessageId === message.id ? (
                          <>
                            <Check data-icon="inline-start" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy data-icon="inline-start" />
                            Copiar
                          </>
                        )}
                      </ChatBubble.Action>
                    </ChatBubble.Actions>
                  </ChatBubble.Footer>
                ) : null}
              </ChatBubble.Root>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
