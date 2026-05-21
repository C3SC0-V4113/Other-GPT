import { toUiMessage } from '@/components/chat/chat-types';

import type { ChatState } from '@/components/chat/chat-types';
import type { ChatAttachment } from '@/lib/chat-attachments';
import type { ChatMessage } from '@/lib/chat-session-store';

export function createInitialChatState(
  initialMessages: ChatMessage[],
  initialAttachments: ChatAttachment[]
): ChatState {
  return {
    audioPlayback: {
      playingMessageId: null,
      ttsLoadingMessageId: null,
    },
    composer: {
      attachments: initialAttachments,
      input: '',
      isImageGenerationMode: false,
      selectedImageAspectRatio: 'auto',
    },
    feedback: {
      copiedMessageId: null,
      errorMessage: '',
    },
    messages: {
      items: initialMessages.map((message, index) => toUiMessage(message, index)),
      lastFailedRequest: null,
    },
    recording: {
      isRecording: false,
      isTranscribing: false,
    },
    request: {
      isSubmitting: false,
      pendingAssistantMessageId: null,
    },
  };
}
