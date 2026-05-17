import type { ChatAction } from '@/components/chat/chat-controller-actions';
import type { ChatState } from '@/components/chat/chat-types';

type ChatComposerState = ChatState['composer'];

export function reduceComposerState(
  state: ChatComposerState,
  action: ChatAction
): ChatComposerState {
  switch (action.type) {
    case 'composer/set-aspect-ratio':
      return {
        ...state,
        selectedImageAspectRatio: action.payload,
      };
    case 'composer/set-image-mode':
      return {
        ...state,
        isImageGenerationMode: action.payload,
      };
    case 'composer/set-input':
      return {
        ...state,
        input: action.payload,
      };
    case 'composer/toggle-image-mode':
      return {
        ...state,
        isImageGenerationMode: !state.isImageGenerationMode,
      };
    case 'messages/clear-all':
    case 'messages/hydrate':
      return {
        ...state,
        input: '',
        isImageGenerationMode: false,
      };
    default:
      return state;
  }
}
