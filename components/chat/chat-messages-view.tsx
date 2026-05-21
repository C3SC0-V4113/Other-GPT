'use client';

import { MessageCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { useChatAudioActions, useChatMessages } from '@/components/chat/chat-controller-provider';
import { MessageBubble } from '@/components/chat/chat-message-bubbles';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { ScrollArea } from '@/components/ui/scroll-area';

import type { ChatUiMessage } from '@/components/chat/chat-types';

function assertNever(value: never): never {
  throw new Error(`Unhandled message variant: ${JSON.stringify(value)}`);
}

function renderMessage(
  message: ChatUiMessage,
  options: {
    copiedMessageId: string | null;
    copyMessageText: (messageId: string, messageText: string) => Promise<void>;
    playMessageAudio: (messageId: string, messageText: string) => Promise<void>;
    playingMessageId: string | null;
    retryLastFailedPrompt: () => Promise<void>;
    stopPlayingAudio: () => void;
    ttsLoadingMessageId: string | null;
  }
) {
  if (message.kind === 'error') {
    return (
      <MessageBubble.systemError
        key={message.id}
        retryLastFailedPrompt={options.retryLastFailedPrompt}
        retryPrompt={message.retryPrompt}
        text={message.content.text}
      />
    );
  }

  if (message.content.type === 'image' || message.content.type === 'image-stream') {
    return (
      <MessageBubble.assistantImage
        content={message.content}
        key={message.id}
        retryLastFailedPrompt={options.retryLastFailedPrompt}
        retryPrompt={message.retryPrompt}
        status={message.status}
      />
    );
  }

  if (message.content.type === 'text') {
    if (message.role === 'user') {
      return (
        <MessageBubble.userText
          attachments={message.content.attachments}
          key={message.id}
          messageId={message.id}
          text={message.content.text}
        />
      );
    }

    if (message.role === 'assistant') {
      return (
        <MessageBubble.assistantText
          key={message.id}
          copyMessageText={options.copyMessageText}
          isCopied={options.copiedMessageId === message.id}
          isPlaying={options.playingMessageId === message.id}
          isTtsLoading={options.ttsLoadingMessageId === message.id}
          messageId={message.id}
          playMessageAudio={options.playMessageAudio}
          retryLastFailedPrompt={options.retryLastFailedPrompt}
          retryPrompt={message.retryPrompt}
          status={message.status}
          stopPlayingAudio={options.stopPlayingAudio}
          text={message.content.text}
        />
      );
    }

    return assertNever(message.role);
  }

  return assertNever(message.content);
}

export function ChatMessagesView() {
  const { copiedMessageId, copyMessageText, isEmptyState, messages, retryLastFailedPrompt } =
    useChatMessages();
  const { playMessageAudio, playingMessageId, stopPlayingAudio, ttsLoadingMessageId } =
    useChatAudioActions();
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
            <Empty className="bg-muted/30">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MessageCircle />
                </EmptyMedia>
                <EmptyTitle>Inicia una conversacion</EmptyTitle>
                <EmptyDescription>
                  Escribe tu primer mensaje o activa el modo imagen desde el boton +.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}

          {messages.map((message) =>
            renderMessage(message, {
              copiedMessageId,
              copyMessageText,
              playMessageAudio,
              playingMessageId,
              retryLastFailedPrompt,
              stopPlayingAudio,
              ttsLoadingMessageId,
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
