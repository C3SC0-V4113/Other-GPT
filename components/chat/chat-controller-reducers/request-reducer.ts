import type { ChatAction } from '@/components/chat/chat-controller-actions';
import type { ChatState } from '@/components/chat/chat-types';

type ChatRequestState = ChatState['request'];

export function reduceRequestState(state: ChatRequestState, action: ChatAction): ChatRequestState {
  switch (action.type) {
    case 'request/set-pending-assistant-message-id':
      return {
        ...state,
        pendingAssistantMessageId: action.payload,
      };
    case 'request/set-submitting':
      return {
        ...state,
        isSubmitting: action.payload,
      };
    default:
      return state;
  }
}
