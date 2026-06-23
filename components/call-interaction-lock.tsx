'use client';

import { createContext, use, useEffect, useMemo, useReducer, useRef } from 'react';

import { cn } from '@/lib/utils';

import type { ChatVoiceStatus } from '@/components/chat/chat-types';
import type { ComponentProps, ReactNode } from 'react';

interface CallInteractionLockContextValue {
  isCallLocked: boolean;
  dispatchCallLocked: (isLocked: boolean) => void;
}

const CallInteractionLockContext = createContext<CallInteractionLockContextValue | null>(null);

export function isExclusiveCallStatus(status: ChatVoiceStatus): boolean {
  return status === 'connecting' || status === 'connected';
}

export function executeUnlessCallLocked<Result>(
  isCallLocked: boolean,
  action: () => Result,
  blockedResult: Result
): Result {
  return isCallLocked ? blockedResult : action();
}

function callInteractionLockReducer(currentIsCallLocked: boolean, nextIsCallLocked: boolean) {
  return currentIsCallLocked === nextIsCallLocked ? currentIsCallLocked : nextIsCallLocked;
}

export function CallInteractionLockProvider({ children }: { children: ReactNode }) {
  const [isCallLocked, dispatchCallLocked] = useReducer(callInteractionLockReducer, false);
  const value = useMemo(() => ({ dispatchCallLocked, isCallLocked }), [isCallLocked]);

  useEffect(() => {
    if (!isCallLocked) {
      return;
    }

    const isCallControl = (target: EventTarget | null) =>
      target instanceof Element && target.closest('[data-call-controls]') !== null;
    const blockSecondaryInteraction = (event: Event) => {
      const isAllowedCallControlEvent =
        isCallControl(event.target) &&
        (!(event instanceof KeyboardEvent) ||
          event.key === 'Enter' ||
          event.key === ' ' ||
          event.key === 'Tab');

      if (isAllowedCallControlEvent) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const containFocus = (event: FocusEvent) => {
      if (isCallControl(event.target)) {
        return;
      }

      blockSecondaryInteraction(event);
      const firstCallControl = document.querySelector<HTMLElement>(
        '[data-call-controls] button:not(:disabled)'
      );
      firstCallControl?.focus();
    };
    const blockedEvents = [
      'click',
      'dblclick',
      'keydown',
      'pointerdown',
      'submit',
      'touchmove',
      'wheel',
    ];

    for (const eventName of blockedEvents) {
      document.addEventListener(eventName, blockSecondaryInteraction, true);
    }
    document.addEventListener('focusin', containFocus, true);

    return () => {
      for (const eventName of blockedEvents) {
        document.removeEventListener(eventName, blockSecondaryInteraction, true);
      }
      document.removeEventListener('focusin', containFocus, true);
    };
  }, [isCallLocked]);

  return (
    <CallInteractionLockContext.Provider value={value}>
      {children}
    </CallInteractionLockContext.Provider>
  );
}

export function useCallInteractionLock() {
  const context = use(CallInteractionLockContext);

  if (!context) {
    throw new Error('useCallInteractionLock must be used within CallInteractionLockProvider.');
  }

  return context;
}

export function CallInteractionLockSynchronizer({ status }: { status: ChatVoiceStatus }) {
  const { dispatchCallLocked } = useCallInteractionLock();
  const isCallLocked = isExclusiveCallStatus(status);
  const previousFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isCallLocked) {
      if (!previousFocusedElementRef.current && document.activeElement instanceof HTMLElement) {
        previousFocusedElementRef.current = document.activeElement;
      }

      dispatchCallLocked(true);
      window.setTimeout(() => {
        document.querySelector<HTMLElement>('[data-call-controls] button:not(:disabled)')?.focus();
      }, 0);

      return () => {
        dispatchCallLocked(false);
      };
    }

    dispatchCallLocked(false);

    if (previousFocusedElementRef.current) {
      const previousFocusedElement = previousFocusedElementRef.current;

      window.setTimeout(() => {
        previousFocusedElement.focus();
        previousFocusedElementRef.current = null;
      }, 0);
    }

    return undefined;
  }, [isCallLocked, dispatchCallLocked]);

  return null;
}

export function CallInteractionBoundary({ children, className, ...props }: ComponentProps<'div'>) {
  const { isCallLocked } = useCallInteractionLock();

  return (
    <div
      {...props}
      aria-hidden={isCallLocked || undefined}
      inert={isCallLocked || undefined}
      className={cn(
        isCallLocked &&
          'pointer-events-none touch-none overflow-hidden select-none [&_[data-slot=scroll-area-viewport]]:overflow-hidden',
        className
      )}
      data-call-locked={isCallLocked}
    >
      {children}
    </div>
  );
}
