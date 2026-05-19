import type { ChatAttachment } from '@/lib/chat-attachments';
import type {
  ChatImageAspectRatio,
  ChatImageMessageContent,
  ChatMessage,
  ChatTextMessageContent,
} from '@/lib/chat-session-store';

type ChatMessageStatus = 'complete' | 'error' | 'interrupted' | 'streaming';
type ChatUiMessageContent = ChatImageMessageContent | ChatTextMessageContent;

export type ChatUiMessage =
  | {
      content: ChatUiMessageContent;
      id: string;
      kind: 'message';
      retryPrompt?: string;
      role: 'assistant' | 'user';
      status: ChatMessageStatus;
    }
  | {
      content: ChatTextMessageContent;
      id: string;
      kind: 'error';
      retryPrompt?: string;
      role: 'system';
      status: 'error';
    };

export interface ChatState {
  audioPlayback: {
    playingMessageId: string | null;
    ttsLoadingMessageId: string | null;
  };
  composer: {
    attachments: ChatAttachment[];
    input: string;
    isImageGenerationMode: boolean;
    selectedImageAspectRatio: ChatImageAspectRatio;
  };
  feedback: {
    copiedMessageId: string | null;
    errorMessage: string;
  };
  messages: {
    items: ChatUiMessage[];
    lastFailedUserPrompt: string | null;
  };
  recording: {
    isRecording: boolean;
    isTranscribing: boolean;
  };
  request: {
    isSubmitting: boolean;
    pendingAssistantMessageId: string | null;
  };
}

export interface ChatProviderValue {
  actions: {
    abortPendingRequest: () => void;
    addErrorBubble: (message: string, options?: { retryPrompt?: string }) => void;
    addFilesAsAttachments: (files: File[]) => Promise<number>;
    clearLocalState: () => void;
    copyMessageText: (messageId: string, messageText: string) => Promise<void>;
    playMessageAudio: (messageId: string, messageText: string) => Promise<void>;
    removeAttachment: (attachmentId: string) => Promise<boolean>;
    resetFromInitialMessages: () => void;
    retryLastFailedPrompt: () => Promise<void>;
    sendMessage: () => Promise<void>;
    setInput: (nextInput: string) => void;
    setSelectedImageAspectRatio: (nextAspectRatio: ChatImageAspectRatio) => void;
    stopGeneration: () => void;
    stopPlayingAudio: () => void;
    toggleImageGenerationMode: () => void;
    toggleRecording: () => Promise<void>;
  };
  derived: {
    isEmptyState: boolean;
    isSendDisabled: boolean;
  };
  state: ChatState;
}

export function toUiMessage(message: ChatMessage, index: number): ChatUiMessage {
  return {
    content: message.content,
    id: `${message.role}-${index}`,
    kind: 'message',
    role: message.role,
    status: 'complete',
  };
}
