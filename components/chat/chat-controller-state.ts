import { toUiMessage } from '@/components/chat/chat-types';

import type { ChatState } from '@/components/chat/chat-types';
import type { ChatMessage } from '@/lib/chat-session-store';

export function createInitialChatState(initialMessages: ChatMessage[]): ChatState {
  return {
    audioPlayback: {
      playingMessageId: null,
      ttsLoadingMessageId: null,
    },
    composer: {
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
      lastFailedUserPrompt: null,
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
