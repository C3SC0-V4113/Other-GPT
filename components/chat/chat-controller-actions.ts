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
