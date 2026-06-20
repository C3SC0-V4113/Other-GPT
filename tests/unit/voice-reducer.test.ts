import { describe, expect, it } from 'vitest';

import { reduceVoiceState } from '@/components/chat/chat-controller-reducers';

import type { ChatState } from '@/components/chat/chat-types';

type ChatVoiceState = ChatState['voice'];

const idle: ChatVoiceState = {
  isAssistantSpeaking: false,
  isMuted: false,
  status: 'idle',
};

describe('reduceVoiceState', () => {
  it('updates the connection status', () => {
    expect(reduceVoiceState(idle, { payload: 'connecting', type: 'voice/set-status' }).status).toBe(
      'connecting'
    );
  });

  it('toggles mute and assistant speaking', () => {
    expect(reduceVoiceState(idle, { payload: true, type: 'voice/set-muted' }).isMuted).toBe(true);
    expect(
      reduceVoiceState(idle, { payload: true, type: 'voice/set-assistant-speaking' })
        .isAssistantSpeaking
    ).toBe(true);
  });

  it('resets to idle on voice/reset and when the conversation is cleared or hydrated', () => {
    const active: ChatVoiceState = {
      isAssistantSpeaking: true,
      isMuted: true,
      status: 'connected',
    };

    expect(reduceVoiceState(active, { type: 'voice/reset' })).toEqual(idle);
    expect(reduceVoiceState(active, { type: 'messages/clear-all' })).toEqual(idle);
    expect(reduceVoiceState(active, { payload: [], type: 'messages/hydrate' })).toEqual(idle);
  });

  it('ignores unrelated actions', () => {
    expect(reduceVoiceState(idle, { payload: true, type: 'request/set-submitting' })).toBe(idle);
  });
});
