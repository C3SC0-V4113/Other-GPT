import { toUiMessage } from '@/components/chat/chat-types';
import { toChatAttachmentSnapshot } from '@/lib/chat-attachments';

import type { ChatAction } from '@/components/chat/chat-controller-actions';
import type { ChatState, ChatUiMessage } from '@/components/chat/chat-types';

type ChatMessagesState = ChatState['messages'];

function updateMessage(
  messages: ChatUiMessage[],
  messageId: string,
  updater: (message: ChatUiMessage) => ChatUiMessage
): ChatUiMessage[] {
  return messages.map((message) => (message.id === messageId ? updater(message) : message));
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
            id: crypto.randomUUID(),
            kind: 'error',
            retryPrompt: action.payload.retryPrompt,
            role: 'system',
            status: 'error',
          },
        ],
      };
    case 'messages/append-image-exchange':
      return {
        ...state,
        items: [
          ...state.items,
          {
            content: {
              attachments: action.payload.userAttachments.map((attachment) =>
                toChatAttachmentSnapshot(attachment)
              ),
              text: action.payload.prompt,
              type: 'text',
            },
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
      };
    case 'messages/append-user-and-pending-assistant':
      return {
        ...state,
        items: [
          ...state.items,
          {
            content: {
              attachments: action.payload.userAttachments.map((attachment) =>
                toChatAttachmentSnapshot(attachment)
              ),
              text: action.payload.userMessage,
              type: 'text',
            },
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
      };
    case 'messages/clear-all':
      return {
        items: [],
        lastFailedUserPrompt: null,
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
        lastFailedUserPrompt: null,
      };
    case 'messages/hydrate':
      return {
        items: action.payload.map((message, index) => toUiMessage(message, index)),
        lastFailedUserPrompt: null,
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
        lastFailedUserPrompt: action.payload.retryPrompt,
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
    case 'messages/set-last-failed-prompt':
      return {
        ...state,
        lastFailedUserPrompt: action.payload,
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
