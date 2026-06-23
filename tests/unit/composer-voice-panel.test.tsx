import { render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import {
  CallInteractionBoundary,
  CallInteractionLockProvider,
  CallInteractionLockSynchronizer,
} from '@/components/call-interaction-lock';
import { ComposerVoicePanel } from '@/components/chat/composer/composer-voice-panel';
import { TooltipProvider } from '@/components/ui/tooltip';
import en from '@/messages/en.json';

import type { ChatVoiceStatus } from '@/components/chat/chat-types';

const voice = vi.hoisted(() => ({
  isAssistantSpeaking: false,
  isMuted: false,
  startVoiceSession: vi.fn(),
  status: 'idle' as ChatVoiceStatus,
  stopVoiceSession: vi.fn(),
  toggleMute: vi.fn(),
}));

vi.mock('@/components/chat/chat-controller-provider', () => ({
  useChatVoiceActions: () => voice,
}));

vi.stubGlobal(
  'ResizeObserver',
  class ResizeObserver {
    disconnect() {}
    observe() {}
    unobserve() {}
  }
);

function VoicePanelHarness() {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      <TooltipProvider>
        <CallInteractionLockProvider>
          <CallInteractionLockSynchronizer status={voice.status} />
          <CallInteractionBoundary data-testid="focus-boundary">
            <button type="button">Previous control</button>
          </CallInteractionBoundary>
          <ComposerVoicePanel />
        </CallInteractionLockProvider>
      </TooltipProvider>
    </NextIntlClientProvider>
  );
}

describe('ComposerVoicePanel focus management', () => {
  it('moves focus to call controls and restores it after the call lock is released', async () => {
    voice.status = 'idle';
    const view = render(<VoicePanelHarness />);
    const previousControl = screen.getByRole('button', { name: 'Previous control' });
    previousControl.focus();

    voice.status = 'connecting';
    view.rerender(<VoicePanelHarness />);

    const endCallButton = screen.getByRole('button', { name: 'End' });
    await waitFor(() => expect(endCallButton.matches(':focus')).toBe(true));
    expect(screen.getByRole('dialog', { name: 'Voice assistant' }).getAttribute('aria-modal')).toBe(
      'true'
    );
    expect(screen.getByTestId('focus-boundary').getAttribute('data-call-locked')).toBe('true');

    voice.status = 'idle';
    view.rerender(<VoicePanelHarness />);

    await waitFor(() => expect(previousControl.matches(':focus')).toBe(true));
    expect(screen.getByTestId('focus-boundary').getAttribute('data-call-locked')).toBe('false');
  });
});
