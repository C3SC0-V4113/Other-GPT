import { useCallback } from 'react';

import type { ChatAction } from '@/components/chat/chat-controller-actions';
import type { Dispatch, MutableRefObject } from 'react';

interface UseChatClipboardEffectsParams {
  addErrorBubble: (message: string) => void;
  copyFeedbackTimeoutRef: MutableRefObject<number | null>;
  dispatch: Dispatch<ChatAction>;
}

export function useChatClipboardEffects({
  addErrorBubble,
  copyFeedbackTimeoutRef,
  dispatch,
}: UseChatClipboardEffectsParams) {
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
