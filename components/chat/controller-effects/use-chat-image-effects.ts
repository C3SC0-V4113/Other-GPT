import { useCallback } from 'react';

import { getErrorMessage } from '@/components/chat/chat-controller-errors';
import { parseApiErrorMessage, parseGenerateImageResponse } from '@/lib/chat-dtos';

import type { ChatAction } from '@/components/chat/chat-controller-actions';
import type { ChatImageAspectRatio } from '@/lib/chat-session-store';
import type { Dispatch, RefObject } from 'react';

interface UseChatImageEffectsParams {
  deps: {
    addErrorBubble: (message: string) => void;
    dispatch: Dispatch<ChatAction>;
  };
  refs: {
    isManualStopRequestedRef: RefObject<boolean>;
    requestAbortControllerRef: RefObject<AbortController | null>;
  };
  request: {
    isSubmitting: boolean;
  };
  composer: {
    selectedImageAspectRatio: ChatImageAspectRatio;
  };
}

export function useChatImageEffects({ composer, deps, refs, request }: UseChatImageEffectsParams) {
  const { addErrorBubble, dispatch } = deps;
  const { isManualStopRequestedRef, requestAbortControllerRef } = refs;
  const { isSubmitting } = request;
  const { selectedImageAspectRatio } = composer;

  const sendImageMessage = useCallback(
    async (trimmedInput: string) => {
      if (!trimmedInput || isSubmitting) {
        return;
      }

      dispatch({ payload: '', type: 'feedback/set-error-message' });
      dispatch({ payload: true, type: 'request/set-submitting' });
      dispatch({ payload: '', type: 'composer/set-input' });
      isManualStopRequestedRef.current = false;

      const controller = new AbortController();
      requestAbortControllerRef.current = controller;

      try {
        const response = await fetch('/api/images', {
          body: JSON.stringify({
            aspectRatio: selectedImageAspectRatio,
            prompt: trimmedInput,
          }),
          headers: { 'content-type': 'application/json' },
          method: 'POST',
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = await response.json();
          throw new Error(parseApiErrorMessage(payload) || 'Image request failed.');
        }

        const payload = await response.json();
        const parsedResponse = parseGenerateImageResponse(payload);

        if (!parsedResponse.ok) {
          throw new Error(parsedResponse.error);
        }

        dispatch({
          payload: {
            image: {
              aspectRatio: parsedResponse.data.aspectRatio,
              imageBase64: parsedResponse.data.imageBase64,
              mimeType: parsedResponse.data.mimeType,
              prompt: parsedResponse.data.prompt,
              type: 'image',
            },
            prompt: trimmedInput,
          },
          type: 'messages/append-image-exchange',
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        const resolvedError = getErrorMessage(error);
        dispatch({ payload: resolvedError, type: 'feedback/set-error-message' });
        addErrorBubble(resolvedError);
      } finally {
        requestAbortControllerRef.current = null;
        isManualStopRequestedRef.current = false;
        dispatch({ payload: false, type: 'request/set-submitting' });
      }
    },
    [
      addErrorBubble,
      dispatch,
      isManualStopRequestedRef,
      isSubmitting,
      requestAbortControllerRef,
      selectedImageAspectRatio,
    ]
  );

  return { sendImageMessage };
}
