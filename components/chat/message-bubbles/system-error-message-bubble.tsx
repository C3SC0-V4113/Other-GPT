import { useTranslations } from 'next-intl';
import { memo } from 'react';

import * as ChatBubble from '@/components/chat/chat-bubble';

import type { SystemErrorMessageBubbleProps } from '@/components/chat/message-bubbles/types';

export const SystemErrorMessageBubble = memo(function SystemErrorMessageBubble({
  retryLastFailedPrompt,
  retryPrompt,
  text,
}: SystemErrorMessageBubbleProps) {
  const t = useTranslations('message');

  return (
    <ChatBubble.Root role="system" state="error">
      <ChatBubble.Header>{t('errorHeader')}</ChatBubble.Header>
      <ChatBubble.Body>{text}</ChatBubble.Body>
      <ChatBubble.Footer>
        <span>{t('errorHeader')}</span>
        {retryPrompt ? (
          <ChatBubble.Actions>
            <ChatBubble.Action
              onClick={() => {
                void retryLastFailedPrompt();
              }}
              variant="destructive"
            >
              {t('retry')}
            </ChatBubble.Action>
          </ChatBubble.Actions>
        ) : null}
      </ChatBubble.Footer>
    </ChatBubble.Root>
  );
});
