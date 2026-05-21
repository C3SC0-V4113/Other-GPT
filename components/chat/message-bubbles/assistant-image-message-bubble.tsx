import { Download } from 'lucide-react';
import Image from 'next/image';

import * as ChatBubble from '@/components/chat/chat-bubble';
import {
  buildDownloadFilename,
  buildImageDataUrl,
  getImageDimensions,
  getImageFrameStyle,
  getImageMaxWidthClass,
} from '@/components/chat/message-bubbles/image-utils';
import { AssistantStatusFooter } from '@/components/chat/message-bubbles/shared';
import { Skeleton } from '@/components/ui/skeleton';

import type { AssistantImageMessageBubbleProps } from '@/components/chat/message-bubbles/types';
import type { ChatImageAspectRatio } from '@/lib/chat-session-store';

function ImageStreamingPreview({
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
  const frameClassName = getImageMaxWidthClass(aspectRatio);

  if (!imageBase64) {
    return (
      <div
        className={`relative w-full overflow-hidden rounded-xl border border-border ${frameClassName}`}
        style={getImageFrameStyle(aspectRatio)}
      >
        <Skeleton className="size-full" />
      </div>
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-border ${frameClassName}`}
      style={getImageFrameStyle(aspectRatio)}
    >
      <Image
        alt={prompt}
        className="object-cover"
        fill
        sizes="(max-width: 768px) 100vw, 768px"
        src={buildImageDataUrl(mimeType, imageBase64)}
        unoptimized
      />
    </div>
  );
}

function CompletedImagePreview({
  aspectRatio,
  imageBase64,
  mimeType,
  prompt,
}: {
  aspectRatio: ChatImageAspectRatio;
  imageBase64: string;
  mimeType: string;
  prompt: string;
}) {
  const dimensions = getImageDimensions(aspectRatio);

  return (
    <div className={getImageMaxWidthClass(aspectRatio)}>
      <Image
        alt={prompt}
        className="h-auto w-full rounded-xl border border-border"
        height={dimensions.height}
        sizes="(max-width: 768px) 100vw, 768px"
        src={buildImageDataUrl(mimeType, imageBase64)}
        unoptimized
        width={dimensions.width}
      />
    </div>
  );
}

function AssistantCompleteImageActions({
  imageBase64,
  mimeType,
  prompt,
}: {
  imageBase64: string;
  mimeType: string;
  prompt: string;
}) {
  return (
    <ChatBubble.Footer>
      <span>Listo</span>
      <ChatBubble.Actions>
        <ChatBubble.Action asChild variant="ghost">
          <a
            download={buildDownloadFilename(prompt, mimeType)}
            href={buildImageDataUrl(mimeType, imageBase64)}
          >
            <Download data-icon="inline-start" />
            Descargar
          </a>
        </ChatBubble.Action>
      </ChatBubble.Actions>
    </ChatBubble.Footer>
  );
}

export function AssistantImageMessageBubble({
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
        {status === 'complete' && content.type === 'image' ? (
          <CompletedImagePreview
            aspectRatio={content.aspectRatio}
            imageBase64={content.imageBase64}
            mimeType={content.mimeType}
            prompt={content.prompt}
          />
        ) : (
          <ImageStreamingPreview
            aspectRatio={content.aspectRatio}
            imageBase64={previewImageBase64}
            mimeType={content.mimeType}
            prompt={content.prompt}
          />
        )}
        <p className="text-xs text-muted-foreground">Prompt: {content.prompt}</p>
        {statusMessage ? <p className="text-xs opacity-90">{statusMessage}</p> : null}
      </ChatBubble.Body>
      {status === 'complete' && content.type === 'image' ? (
        <AssistantCompleteImageActions
          imageBase64={content.imageBase64}
          mimeType={content.mimeType}
          prompt={content.prompt}
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
