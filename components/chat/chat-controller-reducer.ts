import {
  reduceAudioState,
  reduceComposerState,
  reduceFeedbackState,
  reduceMessagesState,
  reduceRecordingState,
  reduceRequestState,
  reduceVoiceState,
} from '@/components/chat/chat-controller-reducers';

import type { ChatAction } from '@/components/chat/chat-controller-actions';
import type { ChatState } from '@/components/chat/chat-types';

export type { ChatAction } from '@/components/chat/chat-controller-actions';
export { createInitialChatState } from '@/components/chat/chat-controller-state';

export function chatControllerReducer(state: ChatState, action: ChatAction): ChatState {
  return {
    audioPlayback: reduceAudioState(state.audioPlayback, action),
    composer: reduceComposerState(state.composer, action),
    feedback: reduceFeedbackState(state.feedback, action),
    messages: reduceMessagesState(state.messages, action),
    recording: reduceRecordingState(state.recording, action),
    request: reduceRequestState(state.request, action),
    voice: reduceVoiceState(state.voice, action),
  };
}
