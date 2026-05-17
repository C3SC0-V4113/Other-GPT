import { useCallback } from 'react';

import type { ChatAction } from '@/components/chat/chat-controller-actions';
import type { Dispatch, RefObject } from 'react';

interface UseChatClipboardEffectsParams {
  deps: {
    addErrorBubble: (message: string) => void;
    dispatch: Dispatch<ChatAction>;
  };
  refs: {
    copyFeedbackTimeoutRef: RefObject<number | null>;
  };
}

export function useChatClipboardEffects({ deps, refs }: UseChatClipboardEffectsParams) {
  const { addErrorBubble, dispatch } = deps;
  const { copyFeedbackTimeoutRef } = refs;

  const copyMessageText = useCallback(
    async (messageId: string, messageText: string) => {
      if (!messageText.trim()) {
        return;
      }

      try {
        await navigator.clipboard.writeText(messageText);
        dispatch({ payload: messageId, type: 'feedback/set-copied-message-id' });

        if (copyFeedbackTimeoutRef.current) {
          window.clearTimeout(copyFeedbackTimeoutRef.current);
        }

        copyFeedbackTimeoutRef.current = window.setTimeout(() => {
          dispatch({ payload: null, type: 'feedback/set-copied-message-id' });
        }, 1800);
      } catch {
        addErrorBubble('Unable to copy the message right now.');
      }
    },
    [addErrorBubble, copyFeedbackTimeoutRef, dispatch]
  );

  return { copyMessageText };
}
