import { Check, Copy, Square, Volume2 } from 'lucide-react';
import { memo } from 'react';

import * as ChatBubble from '@/components/chat/chat-bubble';
import { ChatMarkdown } from '@/components/chat/chat-markdown';
import { AssistantStatusFooter } from '@/components/chat/message-bubbles/shared';

import type { AssistantTextMessageBubbleProps } from '@/components/chat/message-bubbles/types';

function AssistantCompleteActions({
  copyMessageText,
  isCopied,
  isPlaying,
  isTtsLoading,
  messageId,
  playMessageAudio,
  stopPlayingAudio,
  text,
}: Pick<
  AssistantTextMessageBubbleProps,
  | 'copyMessageText'
  | 'isCopied'
  | 'isPlaying'
  | 'isTtsLoading'
  | 'messageId'
  | 'playMessageAudio'
  | 'stopPlayingAudio'
  | 'text'
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
            if (isPlaying) {
              stopPlayingAudio();
              return;
            }

            void playMessageAudio(messageId, text);
          }}
          variant={isPlaying ? 'secondary' : 'ghost'}
        >
          {isTtsLoading ? (
            'Cargando...'
          ) : isPlaying ? (
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
          variant={isCopied ? 'secondary' : 'ghost'}
        >
          {isCopied ? (
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

export const AssistantTextMessageBubble = memo(function AssistantTextMessageBubble({
  copyMessageText,
  isCopied,
  isPlaying,
  isTtsLoading,
  messageId,
  playMessageAudio,
  retryLastFailedPrompt,
  retryPrompt,
  status,
  stopPlayingAudio,
  text,
}: AssistantTextMessageBubbleProps) {
  return (
    <ChatBubble.Root role="assistant" state={status}>
      <ChatBubble.Body className="whitespace-normal">
        {status === 'complete' ? (
          <ChatMarkdown content={text} />
        ) : (
          <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{text}</p>
        )}
      </ChatBubble.Body>

      {status === 'complete' ? (
        <AssistantCompleteActions
          copyMessageText={copyMessageText}
          isCopied={isCopied}
          isPlaying={isPlaying}
          isTtsLoading={isTtsLoading}
          messageId={messageId}
          playMessageAudio={playMessageAudio}
          stopPlayingAudio={stopPlayingAudio}
          text={text}
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
});
