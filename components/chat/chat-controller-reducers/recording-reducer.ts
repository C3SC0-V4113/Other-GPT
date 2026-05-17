import type { ChatAction } from '@/components/chat/chat-controller-actions';
import type { ChatState } from '@/components/chat/chat-types';

type ChatRecordingState = ChatState['recording'];

export function reduceRecordingState(
  state: ChatRecordingState,
  action: ChatAction
): ChatRecordingState {
  switch (action.type) {
    case 'recording/set-recording':
      return {
        ...state,
        isRecording: action.payload,
      };
    case 'recording/set-transcribing':
      return {
        ...state,
        isTranscribing: action.payload,
      };
    default:
      return state;
  }
}
