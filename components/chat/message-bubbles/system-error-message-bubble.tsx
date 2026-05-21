import { memo } from 'react';

import * as ChatBubble from '@/components/chat/chat-bubble';

import type { SystemErrorMessageBubbleProps } from '@/components/chat/message-bubbles/types';

export const SystemErrorMessageBubble = memo(function SystemErrorMessageBubble({
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
});
