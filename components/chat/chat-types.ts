import type { ChatAttachment } from '@/lib/chat-attachments';
import type {
  ChatImageAspectRatio,
  ChatImageMessageContent,
  ChatMessage,
  ChatTextMessageContent,
} from '@/lib/chat-session-store';

type ChatMessageStatus = 'complete' | 'error' | 'interrupted' | 'streaming';

export interface ChatRetryRequest {
  aspectRatio?: ChatImageAspectRatio;
  kind: 'chat' | 'image';
  prompt: string;
}

export interface ChatStreamingImageContent {
  aspectRatio: ChatImageAspectRatio;
  mimeType: string;
  partialImageBase64: string | null;
  prompt: string;
  statusMessage?: string;
  type: 'image-stream';
}

type ChatUiMessageContent =
  | ChatImageMessageContent
  | ChatStreamingImageContent
  | ChatTextMessageContent;

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
    lastFailedRequest: ChatRetryRequest | null;
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

export interface ChatActionHandlers {
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
  setAttachmentIncludedInContext: (
    attachmentId: string,
    isIncludedInContext: boolean
  ) => Promise<boolean>;
  setInput: (nextInput: string) => void;
  setSelectedImageAspectRatio: (nextAspectRatio: ChatImageAspectRatio) => void;
  stopGeneration: () => void;
  stopPlayingAudio: () => void;
  toggleImageGenerationMode: () => void;
  toggleRecording: () => Promise<void>;
}

export interface ChatDerivedState {
  isEmptyState: boolean;
  isSendDisabled: boolean;
}

export interface ChatProviderValue {
  actions: ChatActionHandlers;
  derived: ChatDerivedState;
  state: ChatState;
}

export interface ChatMessagesContextValue {
  copiedMessageId: string | null;
  copyMessageText: (messageId: string, messageText: string) => Promise<void>;
  isEmptyState: boolean;
  messages: ChatUiMessage[];
  retryLastFailedPrompt: () => Promise<void>;
}

export interface ChatRuntimeContextValue {
  abortPendingRequest: () => void;
  addErrorBubble: (message: string, options?: { retryPrompt?: string }) => void;
  clearLocalState: () => void;
  errorMessage: string;
  isSubmitting: boolean;
  resetFromInitialMessages: () => void;
  sendMessage: () => Promise<void>;
  stopGeneration: () => void;
}

export interface ChatComposerStateContextValue {
  addFilesAsAttachments: (files: File[]) => Promise<number>;
  attachments: ChatAttachment[];
  input: string;
  isImageGenerationMode: boolean;
  isRecording: boolean;
  isSendDisabled: boolean;
  isSubmitting: boolean;
  isTranscribing: boolean;
  removeAttachment: (attachmentId: string) => Promise<boolean>;
  setAttachmentIncludedInContext: (
    attachmentId: string,
    isIncludedInContext: boolean
  ) => Promise<boolean>;
  selectedImageAspectRatio: ChatImageAspectRatio;
  setInput: (nextInput: string) => void;
  setSelectedImageAspectRatio: (nextAspectRatio: ChatImageAspectRatio) => void;
  toggleImageGenerationMode: () => void;
  toggleRecording: () => Promise<void>;
}

export interface ChatAudioActionsContextValue {
  playMessageAudio: (messageId: string, messageText: string) => Promise<void>;
  playingMessageId: string | null;
  stopPlayingAudio: () => void;
  ttsLoadingMessageId: string | null;
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
