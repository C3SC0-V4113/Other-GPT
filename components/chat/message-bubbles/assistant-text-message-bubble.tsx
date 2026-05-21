import { Check, Copy, Square, Volume2 } from 'lucide-react';

import * as ChatBubble from '@/components/chat/chat-bubble';
import { ChatMarkdown } from '@/components/chat/chat-markdown';
import { AssistantStatusFooter } from '@/components/chat/message-bubbles/shared';

import type { AssistantTextMessageBubbleProps } from '@/components/chat/message-bubbles/types';

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

export function AssistantTextMessageBubble({
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
