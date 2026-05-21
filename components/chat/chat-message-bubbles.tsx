'use client';

import {
  Check,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  Presentation,
  Copy,
  Square,
  Volume2,
} from 'lucide-react';
import Image from 'next/image';

import * as ChatBubble from '@/components/chat/chat-bubble';
import { ChatMarkdown } from '@/components/chat/chat-markdown';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatAttachmentSize } from '@/lib/chat-attachments';

import type { ChatStreamingImageContent } from '@/components/chat/chat-types';
import type { ChatAttachmentSnapshot } from '@/lib/chat-attachments';
import type { ChatImageAspectRatio } from '@/lib/chat-session-store';

const messageStateLabels = {
  error: 'Error',
  interrupted: 'Interrumpido',
  streaming: 'Generando...',
} as const;

interface UserTextMessageBubbleProps {
  attachments?: ChatAttachmentSnapshot[];
  messageId: string;
  text: string;
}

interface AssistantTextMessageBubbleProps {
  copiedMessageId: string | null;
  copyMessageText: (messageId: string, messageText: string) => Promise<void>;
  messageId: string;
  playingMessageId: string | null;
  playMessageAudio: (messageId: string, messageText: string) => Promise<void>;
  retryLastFailedPrompt: () => Promise<void>;
  retryPrompt?: string;
  status: 'complete' | 'error' | 'interrupted' | 'streaming';
  stopPlayingAudio: () => void;
  text: string;
  ttsLoadingMessageId: string | null;
}

interface AssistantImageMessageBubbleProps {
  content:
    | ChatStreamingImageContent
    | {
        aspectRatio: ChatImageAspectRatio;
        imageBase64: string;
        mimeType: string;
        prompt: string;
        type: 'image';
      };
  retryLastFailedPrompt: () => Promise<void>;
  retryPrompt?: string;
  status: 'complete' | 'error' | 'interrupted' | 'streaming';
}

interface SystemErrorMessageBubbleProps {
  retryLastFailedPrompt: () => Promise<void>;
  retryPrompt?: string;
  text: string;
}

function getAttachmentIcon(attachment: ChatAttachmentSnapshot) {
  if (attachment.kind === 'image') {
    return <FileImage />;
  }

  if (attachment.kind === 'pdf') {
    return <FileType2 />;
  }

  if (attachment.kind === 'spreadsheet') {
    return <FileSpreadsheet />;
  }

  if (attachment.kind === 'presentation') {
    return <Presentation />;
  }

  if (attachment.kind === 'markdown' || attachment.kind === 'document') {
    return <FileText />;
  }

  return <FileArchive />;
}

function UserTextMessageBubble({ attachments, messageId, text }: UserTextMessageBubbleProps) {
  return (
    <ChatBubble.Root key={messageId} role="user" state="complete">
      <ChatBubble.Body className="space-y-2">
        <p>{text}</p>

        {attachments?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {attachments.map((attachment) => (
              <Badge
                key={attachment.id}
                className="h-auto max-w-55 gap-1.5 rounded-lg border-primary-foreground/30 bg-primary-foreground/10 px-2 py-1 text-primary-foreground"
                variant="outline"
              >
                {getAttachmentIcon(attachment)}
                <span className="max-w-28 truncate">{attachment.name}</span>
                <span className="text-[10px] opacity-80">
                  {formatAttachmentSize(attachment.sizeBytes)}
                </span>
              </Badge>
            ))}
          </div>
        ) : null}
      </ChatBubble.Body>
    </ChatBubble.Root>
  );
}

function getImagePlaceholderHeightClass(aspectRatio: ChatImageAspectRatio): string {
  if (aspectRatio === '16:9') {
    return 'h-60 md:h-72';
  }

  if (aspectRatio === '9:16') {
    return 'h-104 max-w-60';
  }

  return 'h-72';
}

function ImagePreview({
  aspectRatio,
  imageBase64,
  mimeType,
  prompt,
}: {
  aspectRatio: ChatImageAspectRatio;
  imageBase64: string | null;
  mimeType: string;
  prompt: string;
}) {
  const frameClassName = getImagePlaceholderHeightClass(aspectRatio);

  if (!imageBase64) {
    return (
      <div className={frameClassName}>
        <Skeleton className="size-full rounded-xl border border-border" />
      </div>
    );
  }

  return (
    <Image
      alt={prompt}
      className="max-h-104 w-full rounded-xl border border-border object-cover"
      height={1024}
      sizes="(max-width: 768px) 100vw, 768px"
      src={`data:${mimeType};base64,${imageBase64}`}
      unoptimized
      width={1024}
    />
  );
}

function AssistantImageMessageBubble({
  content,
  retryLastFailedPrompt,
  retryPrompt,
  status,
}: AssistantImageMessageBubbleProps) {
  const previewImageBase64 =
    content.type === 'image' ? content.imageBase64 : content.partialImageBase64;
  const statusMessage = content.type === 'image-stream' ? content.statusMessage : undefined;

  return (
    <ChatBubble.Root role="assistant" state={status}>
      <ChatBubble.Body className="flex flex-col gap-2 whitespace-normal">
        <ImagePreview
          aspectRatio={content.aspectRatio}
          imageBase64={previewImageBase64}
          mimeType={content.mimeType}
          prompt={content.prompt}
        />
        <p className="text-xs text-muted-foreground">Prompt: {content.prompt}</p>
        {statusMessage ? <p className="text-xs opacity-90">{statusMessage}</p> : null}
      </ChatBubble.Body>
      {status === 'complete' ? null : (
        <AssistantStatusFooter
          retryLastFailedPrompt={retryLastFailedPrompt}
          retryPrompt={retryPrompt}
          status={status}
        />
      )}
    </ChatBubble.Root>
  );
}

function AssistantStatusFooter({
  retryLastFailedPrompt,
  retryPrompt,
  status,
}: Pick<AssistantTextMessageBubbleProps, 'retryLastFailedPrompt' | 'retryPrompt' | 'status'>) {
  if (status === 'complete') {
    return null;
  }

  return (
    <ChatBubble.Footer>
      <span>{messageStateLabels[status]}</span>

      {status === 'interrupted' || (status === 'error' && retryPrompt) ? (
        <ChatBubble.Actions>
          <ChatBubble.Action
            onClick={() => {
              void retryLastFailedPrompt();
            }}
            variant={status === 'error' ? 'destructive' : 'ghost'}
          >
            Reintentar
          </ChatBubble.Action>
        </ChatBubble.Actions>
      ) : null}
    </ChatBubble.Footer>
  );
}

function AssistantCompleteActions({
  copiedMessageId,
  copyMessageText,
  messageId,
  playingMessageId,
  playMessageAudio,
  stopPlayingAudio,
  text,
  ttsLoadingMessageId,
}: Pick<
  AssistantTextMessageBubbleProps,
  | 'copiedMessageId'
  | 'copyMessageText'
  | 'messageId'
  | 'playingMessageId'
  | 'playMessageAudio'
  | 'stopPlayingAudio'
  | 'text'
  | 'ttsLoadingMessageId'
>) {
  if (!text.trim()) {
    return null;
  }

  return (
    <ChatBubble.Footer>
      <span>Listo</span>
      <ChatBubble.Actions>
        <ChatBubble.Action
          onClick={() => {
            if (playingMessageId === messageId) {
              stopPlayingAudio();
              return;
            }

            void playMessageAudio(messageId, text);
          }}
          variant={playingMessageId === messageId ? 'secondary' : 'ghost'}
        >
          {ttsLoadingMessageId === messageId ? (
            'Cargando...'
          ) : playingMessageId === messageId ? (
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
          onClick={() => {
            void copyMessageText(messageId, text);
          }}
          variant={copiedMessageId === messageId ? 'secondary' : 'ghost'}
        >
          {copiedMessageId === messageId ? (
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
  );
}

function AssistantTextMessageBubble({
  copiedMessageId,
  copyMessageText,
  messageId,
  playingMessageId,
  playMessageAudio,
  retryLastFailedPrompt,
  retryPrompt,
  status,
  stopPlayingAudio,
  text,
  ttsLoadingMessageId,
}: AssistantTextMessageBubbleProps) {
  return (
    <ChatBubble.Root role="assistant" state={status}>
      <ChatBubble.Body className="whitespace-normal">
        <ChatMarkdown content={text} />
      </ChatBubble.Body>

      {status === 'complete' ? (
        <AssistantCompleteActions
          copiedMessageId={copiedMessageId}
          copyMessageText={copyMessageText}
          messageId={messageId}
          playingMessageId={playingMessageId}
          playMessageAudio={playMessageAudio}
          stopPlayingAudio={stopPlayingAudio}
          text={text}
          ttsLoadingMessageId={ttsLoadingMessageId}
        />
      ) : (
        <AssistantStatusFooter
          retryLastFailedPrompt={retryLastFailedPrompt}
          retryPrompt={retryPrompt}
          status={status}
        />
      )}
    </ChatBubble.Root>
  );
}

function SystemErrorMessageBubble({
  retryLastFailedPrompt,
  retryPrompt,
  text,
}: SystemErrorMessageBubbleProps) {
  return (
    <ChatBubble.Root role="system" state="error">
      <ChatBubble.Header>Error</ChatBubble.Header>
      <ChatBubble.Body>{text}</ChatBubble.Body>
      <ChatBubble.Footer>
        <span>Error</span>
        {retryPrompt ? (
          <ChatBubble.Actions>
            <ChatBubble.Action
              onClick={() => {
                void retryLastFailedPrompt();
              }}
              variant="destructive"
            >
              Reintentar
            </ChatBubble.Action>
          </ChatBubble.Actions>
        ) : null}
      </ChatBubble.Footer>
    </ChatBubble.Root>
  );
}

export const MessageBubble = {
  assistantImage: AssistantImageMessageBubble,
  assistantText: AssistantTextMessageBubble,
  systemError: SystemErrorMessageBubble,
  userText: UserTextMessageBubble,
} as const;
