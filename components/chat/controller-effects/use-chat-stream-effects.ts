import { useCallback } from 'react';

import { getErrorMessage } from '@/components/chat/chat-controller-errors';
import { parseApiErrorMessage } from '@/lib/chat-dtos';

import type { ChatAction } from '@/components/chat/chat-controller-actions';
import type { ChatAttachment } from '@/lib/chat-attachments';
import type { Dispatch, RefObject } from 'react';

interface UseChatStreamEffectsParams {
  composer: {
    attachments: ChatAttachment[];
  };
  deps: {
    addErrorBubble: (message: string, options?: { retryPrompt?: string }) => void;
    dispatch: Dispatch<ChatAction>;
  };
  options: {
    isManualStopRetryEnabled: boolean;
  };
  refs: {
    isManualStopRequestedRef: RefObject<boolean>;
    requestAbortControllerRef: RefObject<AbortController | null>;
  };
  request: {
    isSubmitting: boolean;
    pendingAssistantMessageId: string | null;
  };
}

interface SendChatMessageParams {
  trimmedInput: string;
}

export function useChatStreamEffects({
  composer,
  deps,
  options,
  refs,
  request,
}: UseChatStreamEffectsParams) {
  const { addErrorBubble, dispatch } = deps;
  const { attachments } = composer;
  const { isManualStopRetryEnabled } = options;
  const { isManualStopRequestedRef, requestAbortControllerRef } = refs;
  const { isSubmitting, pendingAssistantMessageId } = request;

  const abortPendingRequest = useCallback(() => {
    const controller = requestAbortControllerRef.current;

    if (!controller) {
      return;
    }

    controller.abort();
    requestAbortControllerRef.current = null;
    isManualStopRequestedRef.current = false;

    if (pendingAssistantMessageId) {
      dispatch({
        payload: { messageId: pendingAssistantMessageId },
        type: 'messages/remove-one',
      });
    }

    dispatch({ payload: null, type: 'request/set-pending-assistant-message-id' });
    dispatch({ payload: false, type: 'request/set-submitting' });
  }, [dispatch, isManualStopRequestedRef, pendingAssistantMessageId, requestAbortControllerRef]);

  const stopGeneration = useCallback(() => {
    const controller = requestAbortControllerRef.current;

    if (!controller) {
      return;
    }

    isManualStopRequestedRef.current = true;
    controller.abort();
    requestAbortControllerRef.current = null;
    dispatch({ payload: false, type: 'request/set-submitting' });
  }, [dispatch, isManualStopRequestedRef, requestAbortControllerRef]);

  const sendChatMessage = useCallback(
    async ({ trimmedInput }: SendChatMessageParams) => {
      if (!trimmedInput || isSubmitting) {
        return;
      }

      dispatch({ payload: '', type: 'feedback/set-error-message' });
      dispatch({ payload: true, type: 'request/set-submitting' });
      dispatch({ payload: '', type: 'composer/set-input' });

      const requestMessageId = crypto.randomUUID();
      const assistantMessageId = crypto.randomUUID();
      isManualStopRequestedRef.current = false;

      dispatch({
        payload: {
          assistantMessageId,
          requestMessageId,
          userAttachments: attachments,
          userMessage: trimmedInput,
        },
        type: 'messages/append-user-and-pending-assistant',
      });
      dispatch({
        payload: assistantMessageId,
        type: 'request/set-pending-assistant-message-id',
      });

      const controller = new AbortController();
      requestAbortControllerRef.current = controller;
      let assistantContent = '';

      try {
        const response = await fetch('/api/chat', {
          body: JSON.stringify({ message: trimmedInput }),
          headers: { 'content-type': 'application/json' },
          method: 'POST',
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = await response.json();
          throw new Error(parseApiErrorMessage(payload) || 'Request failed.');
        }

        if (!response.body) {
          throw new Error('No response stream available.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        const readNextChunk = async (): Promise<void> => {
          const { done: isDone, value } = await reader.read();

          if (isDone) {
            return;
          }

          assistantContent += decoder.decode(value, { stream: true });
          dispatch({
            payload: {
              assistantMessageId,
              content: assistantContent,
            },
            type: 'messages/update-assistant-stream',
          });

          await readNextChunk();
        };

        await readNextChunk();

        if (!assistantContent) {
          dispatch({
            payload: { messageId: assistantMessageId },
            type: 'messages/remove-one',
          });
        } else {
          dispatch({
            payload: { assistantMessageId },
            type: 'messages/complete-assistant',
          });
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          if (isManualStopRetryEnabled && isManualStopRequestedRef.current) {
            dispatch({ payload: trimmedInput, type: 'messages/set-last-failed-prompt' });

            if (!assistantContent) {
              dispatch({
                payload: { messageId: assistantMessageId },
                type: 'messages/remove-one',
              });
            } else {
              dispatch({
                payload: {
                  assistantMessageId,
                  retryPrompt: trimmedInput,
                },
                type: 'messages/interrupted-assistant',
              });
            }
          }

          return;
        }

        const resolvedError = getErrorMessage(error);
        dispatch({ payload: resolvedError, type: 'feedback/set-error-message' });
        dispatch({
          payload: { messageId: assistantMessageId },
          type: 'messages/remove-one',
        });
        dispatch({ payload: trimmedInput, type: 'messages/set-last-failed-prompt' });
        addErrorBubble(resolvedError, { retryPrompt: trimmedInput });
      } finally {
        requestAbortControllerRef.current = null;
        isManualStopRequestedRef.current = false;
        dispatch({ payload: null, type: 'request/set-pending-assistant-message-id' });
        dispatch({ payload: false, type: 'request/set-submitting' });
      }
    },
    [
      addErrorBubble,
      attachments,
      isManualStopRetryEnabled,
      dispatch,
      isManualStopRequestedRef,
      isSubmitting,
      requestAbortControllerRef,
    ]
  );

  return {
    abortPendingRequest,
    sendChatMessage,
    stopGeneration,
  };
}
