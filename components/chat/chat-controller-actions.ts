import type { ChatRetryRequest, ChatVoiceStatus } from '@/components/chat/chat-types';
import type { ChatAttachment } from '@/lib/chat-attachments';
import type {
  ChatImageAspectRatio,
  ChatImageMessageContent,
  ChatMessage,
} from '@/lib/chat-session-store';

export type ChatAction =
  | { type: 'audio/set-playing-message-id'; payload: string | null }
  | { type: 'audio/set-tts-loading-message-id'; payload: string | null }
  | { type: 'composer/add-attachments'; payload: ChatAttachment[] }
  | {
      type: 'composer/set-attachment-context';
      payload: { attachmentId: string; isIncludedInContext: boolean };
    }
  | { type: 'composer/remove-attachment'; payload: { attachmentId: string } }
  | { type: 'composer/set-aspect-ratio'; payload: ChatImageAspectRatio }
  | { type: 'composer/set-image-mode'; payload: boolean }
  | { type: 'composer/set-input'; payload: string }
  | { type: 'composer/set-attachments'; payload: ChatAttachment[] }
  | { type: 'composer/toggle-image-mode' }
  | { type: 'feedback/set-copied-message-id'; payload: string | null }
  | { type: 'feedback/set-error-message'; payload: string }
  | { type: 'messages/append-error'; payload: { message: string; retryPrompt?: string } }
  | {
      type: 'messages/append-user-and-pending-image-assistant';
      payload: {
        aspectRatio: ChatImageAspectRatio;
        assistantMessageId: string;
        requestMessageId: string;
        userAttachments: ChatAttachment[];
        userMessage: string;
      };
    }
  | {
      type: 'messages/append-user-and-pending-assistant';
      payload: {
        assistantMessageId: string;
        requestMessageId: string;
        userAttachments: ChatAttachment[];
        userMessage: string;
      };
    }
  | { type: 'messages/clear-all' }
  | { type: 'messages/complete-assistant'; payload: { assistantMessageId: string } }
  | {
      type: 'messages/complete-assistant-image';
      payload: { assistantMessageId: string; image: ChatImageMessageContent };
    }
  | {
      type: 'messages/error-assistant-image';
      payload: {
        assistantMessageId: string;
        aspectRatio: ChatImageAspectRatio;
        message: string;
        retryPrompt: string;
      };
    }
  | { type: 'messages/append-voice-assistant'; payload: { messageId: string } }
  | { type: 'messages/append-voice-user'; payload: { messageId: string; text: string } }
  | { type: 'messages/hydrate'; payload: ChatMessage[] }
  | {
      type: 'messages/interrupted-assistant-image';
      payload: {
        assistantMessageId: string;
        aspectRatio: ChatImageAspectRatio;
        retryPrompt: string;
      };
    }
  | {
      type: 'messages/interrupted-assistant';
      payload: { assistantMessageId: string; retryPrompt: string };
    }
  | { type: 'messages/remove-errors' }
  | { type: 'messages/remove-one'; payload: { messageId: string } }
  | { type: 'messages/set-last-failed-request'; payload: ChatRetryRequest | null }
  | {
      type: 'messages/update-assistant-image-stream';
      payload: {
        assistantMessageId: string;
        imageBase64: string;
        message?: string;
      };
    }
  | {
      type: 'messages/update-assistant-stream';
      payload: { assistantMessageId: string; content: string };
    }
  | { type: 'recording/set-recording'; payload: boolean }
  | { type: 'recording/set-transcribing'; payload: boolean }
  | { type: 'request/set-pending-assistant-message-id'; payload: string | null }
  | { type: 'request/set-submitting'; payload: boolean }
  | { type: 'voice/reset' }
  | { type: 'voice/set-assistant-speaking'; payload: boolean }
  | { type: 'voice/set-muted'; payload: boolean }
  | { type: 'voice/set-status'; payload: ChatVoiceStatus };
