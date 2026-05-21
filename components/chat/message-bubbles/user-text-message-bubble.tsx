import { memo } from 'react';

import * as ChatBubble from '@/components/chat/chat-bubble';
import { AttachmentBadges } from '@/components/chat/message-bubbles/shared';

import type { UserTextMessageBubbleProps } from '@/components/chat/message-bubbles/types';

export const UserTextMessageBubble = memo(function UserTextMessageBubble({
  attachments,
  messageId,
  text,
}: UserTextMessageBubbleProps) {
  return (
    <ChatBubble.Root key={messageId} role="user" state="complete">
      <ChatBubble.Body className="space-y-2">
        <p>{text}</p>
        {attachments?.length ? <AttachmentBadges attachments={attachments} /> : null}
      </ChatBubble.Body>
    </ChatBubble.Root>
  );
});
