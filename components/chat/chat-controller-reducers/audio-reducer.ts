import type { ChatAction } from '@/components/chat/chat-controller-actions';
import type { ChatState } from '@/components/chat/chat-types';

type ChatAudioState = ChatState['audioPlayback'];

export function reduceAudioState(state: ChatAudioState, action: ChatAction): ChatAudioState {
  switch (action.type) {
    case 'audio/set-playing-message-id':
      return {
        ...state,
        playingMessageId: action.payload,
      };
    case 'audio/set-tts-loading-message-id':
      return {
        ...state,
        ttsLoadingMessageId: action.payload,
      };
    case 'messages/clear-all':
    case 'messages/hydrate':
      return {
        playingMessageId: null,
        ttsLoadingMessageId: null,
      };
    default:
      return state;
  }
}
