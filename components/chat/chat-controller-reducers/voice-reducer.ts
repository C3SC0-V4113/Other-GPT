import type { ChatAction } from '@/components/chat/chat-controller-actions';
import type { ChatState } from '@/components/chat/chat-types';

type ChatVoiceState = ChatState['voice'];

const IDLE_VOICE_STATE: ChatVoiceState = {
  isAssistantSpeaking: false,
  isMuted: false,
  status: 'idle',
};

export function reduceVoiceState(state: ChatVoiceState, action: ChatAction): ChatVoiceState {
  switch (action.type) {
    case 'voice/set-status':
      return {
        ...state,
        status: action.payload,
      };
    case 'voice/set-muted':
      return {
        ...state,
        isMuted: action.payload,
      };
    case 'voice/set-assistant-speaking':
      return {
        ...state,
        isAssistantSpeaking: action.payload,
      };
    case 'voice/reset':
    case 'messages/clear-all':
    case 'messages/hydrate':
      return { ...IDLE_VOICE_STATE };
    default:
      return state;
  }
}
