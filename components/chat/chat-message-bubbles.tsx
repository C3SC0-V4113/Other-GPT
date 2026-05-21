'use client';

import {
  AssistantImageMessageBubble,
  AssistantTextMessageBubble,
  SystemErrorMessageBubble,
  UserTextMessageBubble,
} from '@/components/chat/message-bubbles';

export const MessageBubble = {
  assistantImage: AssistantImageMessageBubble,
  assistantText: AssistantTextMessageBubble,
  systemError: SystemErrorMessageBubble,
  userText: UserTextMessageBubble,
} as const;
