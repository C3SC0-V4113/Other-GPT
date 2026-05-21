import type { ChatStreamingImageContent } from '@/components/chat/chat-types';
import type { ChatAttachmentSnapshot } from '@/lib/chat-attachments';
import type { ChatImageMessageContent } from '@/lib/chat-session-store';

type MessageBubbleStatus = 'complete' | 'error' | 'interrupted' | 'streaming';

export interface UserTextMessageBubbleProps {
  attachments?: ChatAttachmentSnapshot[];
  messageId: string;
  text: string;
}

export interface AssistantTextMessageBubbleProps {
  copyMessageText: (messageId: string, messageText: string) => Promise<void>;
  isCopied: boolean;
  isPlaying: boolean;
  isTtsLoading: boolean;
  messageId: string;
  playMessageAudio: (messageId: string, messageText: string) => Promise<void>;
  retryLastFailedPrompt: () => Promise<void>;
  retryPrompt?: string;
  status: MessageBubbleStatus;
  stopPlayingAudio: () => void;
  text: string;
}

export interface AssistantImageMessageBubbleProps {
  content: ChatImageMessageContent | ChatStreamingImageContent;
  retryLastFailedPrompt: () => Promise<void>;
  retryPrompt?: string;
  status: MessageBubbleStatus;
}

export interface SystemErrorMessageBubbleProps {
  retryLastFailedPrompt: () => Promise<void>;
  retryPrompt?: string;
  text: string;
}
