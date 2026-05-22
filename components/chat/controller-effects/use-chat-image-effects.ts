import { useCallback } from 'react';

import { getErrorMessage } from '@/components/chat/chat-controller-errors';
import { getIncludedChatAttachments } from '@/lib/chat-attachments';
import { parseApiErrorFromResponse, parseGenerateImageStreamEvent } from '@/lib/chat-dtos';
import { createClientId } from '@/lib/client-id';

import type { ChatAction } from '@/components/chat/chat-controller-actions';
import type { ChatAttachment } from '@/lib/chat-attachments';
import type { ChatImageAspectRatio } from '@/lib/chat-session-store';
import type { Dispatch, RefObject } from 'react';

interface UseChatImageEffectsParams {
  deps: {
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
    attachments: ChatAttachment[];
    selectedImageAspectRatio: ChatImageAspectRatio;
  };
}

export function useChatImageEffects({ composer, deps, refs, request }: UseChatImageEffectsParams) {
  const { dispatch } = deps;
  const { isManualStopRequestedRef, requestAbortControllerRef } = refs;
  const { isSubmitting } = request;
  const { attachments, selectedImageAspectRatio } = composer;

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
      const requestMessageId = createClientId();
      const assistantMessageId = createClientId();
      const contextAttachments = getIncludedChatAttachments(attachments);
      requestAbortControllerRef.current = controller;

      try {
        dispatch({
          payload: {
            aspectRatio: selectedImageAspectRatio,
            assistantMessageId,
            requestMessageId,
            userAttachments: contextAttachments,
            userMessage: trimmedInput,
          },
          type: 'messages/append-user-and-pending-image-assistant',
        });
        dispatch({
          payload: assistantMessageId,
          type: 'request/set-pending-assistant-message-id',
        });

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
          const errorMessage = await parseApiErrorFromResponse(response, 'Image request failed.');
          dispatch({ payload: errorMessage, type: 'feedback/set-error-message' });
          dispatch({
            payload: {
              assistantMessageId,
              aspectRatio: selectedImageAspectRatio,
              message: errorMessage,
              retryPrompt: trimmedInput,
            },
            type: 'messages/error-assistant-image',
          });
          dispatch({
            payload: {
              aspectRatio: selectedImageAspectRatio,
              kind: 'image',
              prompt: trimmedInput,
            },
            type: 'messages/set-last-failed-request',
          });
          return;
        }

        if (!response.body) {
          throw new Error('No response stream available.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let didComplete = false;
        let didFail = false;

        const processLine = (line: string) => {
          if (didComplete || didFail) {
            return;
          }

          const trimmedLine = line.trim();

          if (!trimmedLine) {
            return;
          }

          let payload: unknown;

          try {
            payload = JSON.parse(trimmedLine) as unknown;
          } catch {
            throw new Error('Invalid image stream event received.');
          }

          const parsedEvent = parseGenerateImageStreamEvent(payload);

          if (!parsedEvent.ok) {
            throw new Error(parsedEvent.error);
          }

          if (parsedEvent.data.type === 'partial_image') {
            dispatch({
              payload: {
                assistantMessageId,
                imageBase64: parsedEvent.data.imageBase64,
              },
              type: 'messages/update-assistant-image-stream',
            });
            return;
          }

          if (parsedEvent.data.type === 'complete') {
            didComplete = true;
            dispatch({
              payload: {
                assistantMessageId,
                image: {
                  aspectRatio: parsedEvent.data.aspectRatio,
                  imageBase64: parsedEvent.data.imageBase64,
                  mimeType: parsedEvent.data.mimeType,
                  prompt: parsedEvent.data.prompt,
                  type: 'image',
                },
              },
              type: 'messages/complete-assistant-image',
            });
            return;
          }

          didFail = true;
          dispatch({ payload: parsedEvent.data.message, type: 'feedback/set-error-message' });
          dispatch({
            payload: {
              assistantMessageId,
              aspectRatio: selectedImageAspectRatio,
              message: parsedEvent.data.message,
              retryPrompt: trimmedInput,
            },
            type: 'messages/error-assistant-image',
          });
          dispatch({
            payload: {
              aspectRatio: selectedImageAspectRatio,
              kind: 'image',
              prompt: trimmedInput,
            },
            type: 'messages/set-last-failed-request',
          });
        };

        const readNextChunk = async (): Promise<void> => {
          const { done: isDone, value } = await reader.read();

          if (isDone) {
            buffer += decoder.decode();
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            processLine(line);
          }

          await readNextChunk();
        };

        await readNextChunk();

        if (buffer.trim()) {
          processLine(buffer);
        }

        if (!didComplete && !didFail) {
          throw new Error('Image response ended before completion.');
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          if (isManualStopRequestedRef.current) {
            dispatch({
              payload: {
                assistantMessageId,
                aspectRatio: selectedImageAspectRatio,
                retryPrompt: trimmedInput,
              },
              type: 'messages/interrupted-assistant-image',
            });
          }

          return;
        }

        const resolvedError = getErrorMessage(error);
        dispatch({ payload: resolvedError, type: 'feedback/set-error-message' });
        dispatch({
          payload: {
            assistantMessageId,
            aspectRatio: selectedImageAspectRatio,
            message: resolvedError,
            retryPrompt: trimmedInput,
          },
          type: 'messages/error-assistant-image',
        });
        dispatch({
          payload: {
            aspectRatio: selectedImageAspectRatio,
            kind: 'image',
            prompt: trimmedInput,
          },
          type: 'messages/set-last-failed-request',
        });
      } finally {
        requestAbortControllerRef.current = null;
        isManualStopRequestedRef.current = false;
        dispatch({ payload: null, type: 'request/set-pending-assistant-message-id' });
        dispatch({ payload: false, type: 'request/set-submitting' });
      }
    },
    [
      dispatch,
      isManualStopRequestedRef,
      isSubmitting,
      requestAbortControllerRef,
      selectedImageAspectRatio,
      attachments,
    ]
  );

  return { sendImageMessage };
}
