import { toUiMessage } from '@/components/chat/chat-types';
import { toChatAttachmentSnapshot } from '@/lib/chat-attachments';
import { createClientId } from '@/lib/client-id';

import type { ChatAction } from '@/components/chat/chat-controller-actions';
import type {
  ChatRetryRequest,
  ChatState,
  ChatStreamingImageContent,
  ChatUiMessage,
} from '@/components/chat/chat-types';
import type { ChatAttachment } from '@/lib/chat-attachments';

type ChatMessagesState = ChatState['messages'];

function updateMessage(
  messages: ChatUiMessage[],
  messageId: string,
  updater: (message: ChatUiMessage) => ChatUiMessage
): ChatUiMessage[] {
  return messages.map((message) => (message.id === messageId ? updater(message) : message));
}

function createUserTextMessage(
  requestMessageId: string,
  userMessage: string,
  userAttachments: ChatAttachment[]
): ChatUiMessage {
  return {
    content: {
      attachments: userAttachments.map((attachment) => toChatAttachmentSnapshot(attachment)),
      text: userMessage,
      type: 'text',
    },
    id: requestMessageId,
    kind: 'message',
    role: 'user',
    status: 'complete',
  };
}

function createStreamingImageContent(
  aspectRatio: ChatStreamingImageContent['aspectRatio'],
  prompt: string
): ChatStreamingImageContent {
  return {
    aspectRatio,
    mimeType: 'image/png',
    partialImageBase64: null,
    prompt,
    type: 'image-stream',
  };
}

function createRetryRequest(
  kind: ChatRetryRequest['kind'],
  prompt: string,
  aspectRatio?: ChatRetryRequest['aspectRatio']
): ChatRetryRequest {
  return aspectRatio ? { aspectRatio, kind, prompt } : { kind, prompt };
}

export function reduceMessagesState(
  state: ChatMessagesState,
  action: ChatAction
): ChatMessagesState {
  switch (action.type) {
    case 'messages/append-error':
      return {
        ...state,
        items: [
          ...state.items,
          {
            content: { text: action.payload.message, type: 'text' },
            id: createClientId(),
            kind: 'error',
            retryPrompt: action.payload.retryPrompt,
            role: 'system',
            status: 'error',
          },
        ],
      };
    case 'messages/append-user-and-pending-image-assistant':
      return {
        ...state,
        items: [
          ...state.items,
          createUserTextMessage(
            action.payload.requestMessageId,
            action.payload.userMessage,
            action.payload.userAttachments
          ),
          {
            content: createStreamingImageContent(
              action.payload.aspectRatio,
              action.payload.userMessage
            ),
            id: action.payload.assistantMessageId,
            kind: 'message',
            role: 'assistant',
            status: 'streaming',
          },
        ],
        lastFailedRequest: null,
      };
    case 'messages/append-user-and-pending-assistant':
      return {
        ...state,
        items: [
          ...state.items,
          createUserTextMessage(
            action.payload.requestMessageId,
            action.payload.userMessage,
            action.payload.userAttachments
          ),
          {
            content: { text: '', type: 'text' },
            id: action.payload.assistantMessageId,
            kind: 'message',
            role: 'assistant',
            status: 'streaming',
          },
        ],
        lastFailedRequest: null,
      };
    case 'messages/clear-all':
      return {
        items: [],
        lastFailedRequest: null,
      };
    case 'messages/complete-assistant':
      return {
        ...state,
        items: updateMessage(
          state.items,
          action.payload.assistantMessageId,
          (message): ChatUiMessage =>
            message.kind === 'message' && message.role === 'assistant'
              ? {
                  ...message,
                  status: 'complete',
                }
              : message
        ),
        lastFailedRequest: null,
      };
    case 'messages/complete-assistant-image':
      return {
        ...state,
        items: updateMessage(
          state.items,
          action.payload.assistantMessageId,
          (message): ChatUiMessage =>
            message.kind === 'message' && message.role === 'assistant'
              ? {
                  ...message,
                  content: action.payload.image,
                  retryPrompt: undefined,
                  status: 'complete',
                }
              : message
        ),
        lastFailedRequest: null,
      };
    case 'messages/error-assistant-image':
      return {
        ...state,
        items: updateMessage(
          state.items,
          action.payload.assistantMessageId,
          (message): ChatUiMessage =>
            message.kind === 'message' &&
            message.role === 'assistant' &&
            message.content.type === 'image-stream'
              ? {
                  ...message,
                  content: {
                    ...message.content,
                    statusMessage: action.payload.message,
                  },
                  retryPrompt: action.payload.retryPrompt,
                  status: 'error',
                }
              : message
        ),
        lastFailedRequest: createRetryRequest(
          'image',
          action.payload.retryPrompt,
          action.payload.aspectRatio
        ),
      };
    case 'messages/hydrate':
      return {
        items: action.payload.map((message, index) => toUiMessage(message, index)),
        lastFailedRequest: null,
      };
    case 'messages/interrupted-assistant-image':
      return {
        ...state,
        items: updateMessage(
          state.items,
          action.payload.assistantMessageId,
          (message): ChatUiMessage =>
            message.kind === 'message' &&
            message.role === 'assistant' &&
            message.content.type === 'image-stream'
              ? {
                  ...message,
                  retryPrompt: action.payload.retryPrompt,
                  status: 'interrupted',
                }
              : message
        ),
        lastFailedRequest: createRetryRequest(
          'image',
          action.payload.retryPrompt,
          action.payload.aspectRatio
        ),
      };
    case 'messages/interrupted-assistant':
      return {
        ...state,
        items: updateMessage(
          state.items,
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
        lastFailedRequest: createRetryRequest('chat', action.payload.retryPrompt),
      };
    case 'messages/remove-errors':
      return {
        ...state,
        items: state.items.filter((message) => message.kind !== 'error'),
      };
    case 'messages/remove-one':
      return {
        ...state,
        items: state.items.filter((message) => message.id !== action.payload.messageId),
      };
    case 'messages/set-last-failed-request':
      return {
        ...state,
        lastFailedRequest: action.payload,
      };
    case 'messages/update-assistant-image-stream':
      return {
        ...state,
        items: updateMessage(
          state.items,
          action.payload.assistantMessageId,
          (message): ChatUiMessage =>
            message.kind === 'message' &&
            message.role === 'assistant' &&
            message.content.type === 'image-stream'
              ? {
                  ...message,
                  content: {
                    ...message.content,
                    partialImageBase64: action.payload.imageBase64,
                    statusMessage: action.payload.message,
                  },
                  status: 'streaming',
                }
              : message
        ),
      };
    case 'messages/update-assistant-stream':
      return {
        ...state,
        items: updateMessage(
          state.items,
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
      };
    default:
      return state;
  }
}
