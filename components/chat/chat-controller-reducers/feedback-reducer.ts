import type { ChatAction } from '@/components/chat/chat-controller-actions';
import type { ChatState } from '@/components/chat/chat-types';

type ChatFeedbackState = ChatState['feedback'];

export function reduceFeedbackState(
  state: ChatFeedbackState,
  action: ChatAction
): ChatFeedbackState {
  switch (action.type) {
    case 'feedback/set-copied-message-id':
      return {
        ...state,
        copiedMessageId: action.payload,
      };
    case 'feedback/set-error-message':
      return {
        ...state,
        errorMessage: action.payload,
      };
    case 'messages/clear-all':
    case 'messages/hydrate':
      return {
        copiedMessageId: null,
        errorMessage: '',
      };
    default:
      return state;
  }
}
