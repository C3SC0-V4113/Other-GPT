import { toUiMessage } from '@/components/chat/chat-types';

import type { ChatState, ChatUiMessage } from '@/components/chat/chat-types';
import type {
  ChatImageAspectRatio,
  ChatImageMessageContent,
  ChatMessage,
} from '@/lib/chat-session-store';

export type ChatAction =
  | { type: 'audio/set-playing-message-id'; payload: string | null }
  | { type: 'audio/set-tts-loading-message-id'; payload: string | null }
  | { type: 'composer/set-aspect-ratio'; payload: ChatImageAspectRatio }
  | { type: 'composer/set-image-mode'; payload: boolean }
  | { type: 'composer/set-input'; payload: string }
  | { type: 'composer/toggle-image-mode' }
  | { type: 'feedback/set-copied-message-id'; payload: string | null }
  | { type: 'feedback/set-error-message'; payload: string }
  | { type: 'messages/append-error'; payload: { message: string; retryPrompt?: string } }
  | {
      type: 'messages/append-image-exchange';
      payload: { image: ChatImageMessageContent; prompt: string };
    }
  | {
      type: 'messages/append-user-and-pending-assistant';
      payload: { assistantMessageId: string; requestMessageId: string; userMessage: string };
    }
  | { type: 'messages/clear-all' }
  | { type: 'messages/complete-assistant'; payload: { assistantMessageId: string } }
  | { type: 'messages/hydrate'; payload: ChatMessage[] }
  | {
      type: 'messages/interrupted-assistant';
      payload: { assistantMessageId: string; retryPrompt: string };
    }
  | { type: 'messages/remove-errors' }
  | { type: 'messages/remove-one'; payload: { messageId: string } }
  | { type: 'messages/set-last-failed-prompt'; payload: string | null }
  | {
      type: 'messages/update-assistant-stream';
      payload: { assistantMessageId: string; content: string };
    }
  | { type: 'recording/set-recording'; payload: boolean }
  | { type: 'recording/set-transcribing'; payload: boolean }
  | { type: 'request/set-pending-assistant-message-id'; payload: string | null }
  | { type: 'request/set-submitting'; payload: boolean };

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

function updateMessage(
  messages: ChatUiMessage[],
  messageId: string,
  updater: (message: ChatUiMessage) => ChatUiMessage
): ChatUiMessage[] {
  return messages.map((message) => (message.id === messageId ? updater(message) : message));
}

export function chatControllerReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'audio/set-playing-message-id':
      return {
        ...state,
        audioPlayback: {
          ...state.audioPlayback,
          playingMessageId: action.payload,
        },
      };

    case 'audio/set-tts-loading-message-id':
      return {
        ...state,
        audioPlayback: {
          ...state.audioPlayback,
          ttsLoadingMessageId: action.payload,
        },
      };

    case 'composer/set-aspect-ratio':
      return {
        ...state,
        composer: {
          ...state.composer,
          selectedImageAspectRatio: action.payload,
        },
      };

    case 'composer/set-image-mode':
      return {
        ...state,
        composer: {
          ...state.composer,
          isImageGenerationMode: action.payload,
        },
      };

    case 'composer/set-input':
      return {
        ...state,
        composer: {
          ...state.composer,
          input: action.payload,
        },
      };

    case 'composer/toggle-image-mode':
      return {
        ...state,
        composer: {
          ...state.composer,
          isImageGenerationMode: !state.composer.isImageGenerationMode,
        },
      };

    case 'feedback/set-copied-message-id':
      return {
        ...state,
        feedback: {
          ...state.feedback,
          copiedMessageId: action.payload,
        },
      };

    case 'feedback/set-error-message':
      return {
        ...state,
        feedback: {
          ...state.feedback,
          errorMessage: action.payload,
        },
      };

    case 'messages/append-error':
      return {
        ...state,
        messages: {
          ...state.messages,
          items: [
            ...state.messages.items,
            {
              content: { text: action.payload.message, type: 'text' },
              id: crypto.randomUUID(),
              kind: 'error',
              retryPrompt: action.payload.retryPrompt,
              role: 'system',
              status: 'error',
            },
          ],
        },
      };

    case 'messages/append-image-exchange':
      return {
        ...state,
        messages: {
          ...state.messages,
          items: [
            ...state.messages.items,
            {
              content: { text: action.payload.prompt, type: 'text' },
              id: crypto.randomUUID(),
              kind: 'message',
              role: 'user',
              status: 'complete',
            },
            {
              content: action.payload.image,
              id: crypto.randomUUID(),
              kind: 'message',
              role: 'assistant',
              status: 'complete',
            },
          ],
          lastFailedUserPrompt: null,
        },
      };

    case 'messages/append-user-and-pending-assistant':
      return {
        ...state,
        messages: {
          ...state.messages,
          items: [
            ...state.messages.items,
            {
              content: { text: action.payload.userMessage, type: 'text' },
              id: action.payload.requestMessageId,
              kind: 'message',
              role: 'user',
              status: 'complete',
            },
            {
              content: { text: '', type: 'text' },
              id: action.payload.assistantMessageId,
              kind: 'message',
              role: 'assistant',
              status: 'streaming',
            },
          ],
        },
      };

    case 'messages/clear-all':
      return {
        ...state,
        audioPlayback: {
          playingMessageId: null,
          ttsLoadingMessageId: null,
        },
        composer: {
          ...state.composer,
          input: '',
          isImageGenerationMode: false,
        },
        feedback: {
          copiedMessageId: null,
          errorMessage: '',
        },
        messages: {
          items: [],
          lastFailedUserPrompt: null,
        },
      };

    case 'messages/complete-assistant':
      return {
        ...state,
        messages: {
          ...state.messages,
          items: updateMessage(
            state.messages.items,
            action.payload.assistantMessageId,
            (message): ChatUiMessage =>
              message.kind === 'message' && message.role === 'assistant'
                ? {
                    ...message,
                    status: 'complete',
                  }
                : message
          ),
          lastFailedUserPrompt: null,
        },
      };

    case 'messages/hydrate':
      return {
        ...state,
        audioPlayback: {
          playingMessageId: null,
          ttsLoadingMessageId: null,
        },
        composer: {
          ...state.composer,
          input: '',
          isImageGenerationMode: false,
        },
        feedback: {
          copiedMessageId: null,
          errorMessage: '',
        },
        messages: {
          items: action.payload.map((message, index) => toUiMessage(message, index)),
          lastFailedUserPrompt: null,
        },
      };

    case 'messages/interrupted-assistant':
      return {
        ...state,
        messages: {
          ...state.messages,
          items: updateMessage(
            state.messages.items,
            action.payload.assistantMessageId,
            (message): ChatUiMessage =>
              message.kind === 'message' && message.role === 'assistant'
                ? {
                    ...message,
                    retryPrompt: action.payload.retryPrompt,
                    status: 'interrupted',
                  }
                : message
          ),
          lastFailedUserPrompt: action.payload.retryPrompt,
        },
      };

    case 'messages/remove-errors':
      return {
        ...state,
        messages: {
          ...state.messages,
          items: state.messages.items.filter((message) => message.kind !== 'error'),
        },
      };

    case 'messages/remove-one':
      return {
        ...state,
        messages: {
          ...state.messages,
          items: state.messages.items.filter((message) => message.id !== action.payload.messageId),
        },
      };

    case 'messages/set-last-failed-prompt':
      return {
        ...state,
        messages: {
          ...state.messages,
          lastFailedUserPrompt: action.payload,
        },
      };

    case 'messages/update-assistant-stream':
      return {
        ...state,
        messages: {
          ...state.messages,
          items: updateMessage(
            state.messages.items,
            action.payload.assistantMessageId,
            (message): ChatUiMessage =>
              message.kind === 'message' &&
              message.role === 'assistant' &&
              message.content.type === 'text'
                ? {
                    ...message,
                    content: { text: action.payload.content, type: 'text' },
                    status: 'streaming',
                  }
                : message
          ),
        },
      };

    case 'recording/set-recording':
      return {
        ...state,
        recording: {
          ...state.recording,
          isRecording: action.payload,
        },
      };

    case 'recording/set-transcribing':
      return {
        ...state,
        recording: {
          ...state.recording,
          isTranscribing: action.payload,
        },
      };

    case 'request/set-pending-assistant-message-id':
      return {
        ...state,
        request: {
          ...state.request,
          pendingAssistantMessageId: action.payload,
        },
      };

    case 'request/set-submitting':
      return {
        ...state,
        request: {
          ...state.request,
          isSubmitting: action.payload,
        },
      };

    default:
      return state;
  }
}
