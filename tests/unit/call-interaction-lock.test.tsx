import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  CallInteractionBoundary,
  CallInteractionLockProvider,
  CallInteractionLockSynchronizer,
  executeUnlessCallLocked,
  useCallInteractionLock,
} from '@/components/call-interaction-lock';

import type { ChatVoiceStatus } from '@/components/chat/chat-types';

function LockState() {
  const { isCallLocked } = useCallInteractionLock();

  return <output>{isCallLocked ? 'locked' : 'unlocked'}</output>;
}

function Harness({ status }: { status: ChatVoiceStatus }) {
  return (
    <CallInteractionLockProvider>
      <CallInteractionLockSynchronizer status={status} />
      <LockState />
      <CallInteractionBoundary data-testid="secondary">
        <button type="button">Secondary action</button>
      </CallInteractionBoundary>
    </CallInteractionLockProvider>
  );
}

describe('exclusive call interaction lock', () => {
  it.each<ChatVoiceStatus>(['connecting', 'connected'])(
    'locks secondary interaction while voice status is %s',
    async (status) => {
      render(<Harness status={status} />);

      await waitFor(() => {
        expect(screen.getByText('locked')).toBeTruthy();
      });

      const boundary = screen.getByTestId('secondary');
      expect(boundary.getAttribute('inert')).not.toBeNull();
      expect(boundary.getAttribute('aria-hidden')).toBe('true');
      expect(boundary.getAttribute('data-call-locked')).toBe('true');
    }
  );

  it.each<ChatVoiceStatus>(['idle', 'error'])(
    'restores secondary interaction while voice status is %s',
    async (status) => {
      render(<Harness status={status} />);

      await waitFor(() => {
        expect(screen.getByText('unlocked')).toBeTruthy();
      });

      const boundary = screen.getByTestId('secondary');
      expect(boundary.getAttribute('inert')).toBeNull();
      expect(boundary.getAttribute('aria-hidden')).toBeNull();
      expect(boundary.getAttribute('data-call-locked')).toBe('false');
    }
  );

  it('blocks interactions rendered through a portal outside inert boundaries', async () => {
    const user = userEvent.setup();
    const secondaryAction = vi.fn();

    render(
      <CallInteractionLockProvider>
        <CallInteractionLockSynchronizer status="connected" />
        <button onClick={secondaryAction} type="button">
          Portaled secondary action
        </button>
        <div data-call-controls>
          <button type="button">End call</button>
        </div>
      </CallInteractionLockProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Portaled secondary action')).toBeTruthy();
    });
    await user.click(screen.getByRole('button', { name: 'Portaled secondary action' }));

    expect(secondaryAction).not.toHaveBeenCalled();
  });
  it('blocks secondary actions invoked outside the DOM while a call is locked', () => {
    const action = vi.fn(() => 'result');

    expect(executeUnlessCallLocked(true, action, 'blocked')).toBe('blocked');
    expect(action).not.toHaveBeenCalled();

    expect(executeUnlessCallLocked(false, action, 'blocked')).toBe('result');
    expect(action).toHaveBeenCalledOnce();
  });
});
