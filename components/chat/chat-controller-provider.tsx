'use client';

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';

import {
  chatControllerReducer,
  createInitialChatState,
} from '@/components/chat/chat-controller-reducer';
import {
  parseApiErrorMessage,
  parseGenerateImageResponse,
  parseTranscriptionResponse,
} from '@/lib/chat-dtos';

import type { ChatProviderValue } from '@/components/chat/chat-types';
import type { ChatImageAspectRatio, ChatMessage } from '@/lib/chat-session-store';

interface ChatProviderProps {
  children: ReactNode;
  initialMessages: ChatMessage[];
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'An unexpected error occurred.';
}

function useChatProviderValue(initialMessages: ChatMessage[]): ChatProviderValue {
  const [state, dispatch] = useReducer(
    chatControllerReducer,
    initialMessages,
    createInitialChatState
  );

  const abortControllerRef = useRef<AbortController | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const copyFeedbackTimeoutRef = useRef<number | null>(null);
  const isManualStopRequestedRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  const releaseAudioResources = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = '';
      audioElementRef.current = null;
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    dispatch({ payload: null, type: 'audio/set-playing-message-id' });
  }, []);

  const addErrorBubble = useCallback(
    (message: string, options?: { retryPrompt?: string }) => {
      dispatch({
        payload: {
          message,
          retryPrompt: options?.retryPrompt,
        },
        type: 'messages/append-error',
      });
    },
    [dispatch]
  );

  const abortPendingRequest = useCallback(() => {
    const controller = abortControllerRef.current;

    if (!controller) {
      return;
    }

    controller.abort();
    abortControllerRef.current = null;
    isManualStopRequestedRef.current = false;

    if (state.request.pendingAssistantMessageId) {
      dispatch({
        payload: { messageId: state.request.pendingAssistantMessageId },
        type: 'messages/remove-one',
      });
    }

    dispatch({ payload: null, type: 'request/set-pending-assistant-message-id' });
    dispatch({ payload: false, type: 'request/set-submitting' });
  }, [state.request.pendingAssistantMessageId]);

  const stopGeneration = useCallback(() => {
    const controller = abortControllerRef.current;

    if (!controller) {
      return;
    }

    isManualStopRequestedRef.current = true;
    controller.abort();
    abortControllerRef.current = null;
    dispatch({ payload: false, type: 'request/set-submitting' });
  }, []);

  const clearLocalState = useCallback(() => {
    abortPendingRequest();
    releaseAudioResources();
    dispatch({ type: 'messages/clear-all' });
  }, [abortPendingRequest, releaseAudioResources]);

  const resetFromInitialMessages = useCallback(() => {
    abortPendingRequest();
    releaseAudioResources();
    dispatch({ payload: initialMessages, type: 'messages/hydrate' });
  }, [abortPendingRequest, initialMessages, releaseAudioResources]);

  const sendChatMessage = useCallback(
    async (rawInput: string) => {
      const trimmedInput = rawInput.trim();

      if (!trimmedInput || state.request.isSubmitting) {
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
          userMessage: trimmedInput,
        },
        type: 'messages/append-user-and-pending-assistant',
      });
      dispatch({
        payload: assistantMessageId,
        type: 'request/set-pending-assistant-message-id',
      });

      const controller = new AbortController();
      abortControllerRef.current = controller;
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
          if (isManualStopRequestedRef.current) {
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
        abortControllerRef.current = null;
        isManualStopRequestedRef.current = false;
        dispatch({ payload: null, type: 'request/set-pending-assistant-message-id' });
        dispatch({ payload: false, type: 'request/set-submitting' });
      }
    },
    [addErrorBubble, state.request.isSubmitting]
  );

  const sendImageMessage = useCallback(
    async (rawInput: string) => {
      const trimmedInput = rawInput.trim();

      if (!trimmedInput || state.request.isSubmitting) {
        return;
      }

      dispatch({ payload: '', type: 'feedback/set-error-message' });
      dispatch({ payload: true, type: 'request/set-submitting' });
      dispatch({ payload: '', type: 'composer/set-input' });
      isManualStopRequestedRef.current = false;

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch('/api/images', {
          body: JSON.stringify({
            aspectRatio: state.composer.selectedImageAspectRatio,
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
        abortControllerRef.current = null;
        isManualStopRequestedRef.current = false;
        dispatch({ payload: false, type: 'request/set-submitting' });
      }
    },
    [addErrorBubble, state.composer.selectedImageAspectRatio, state.request.isSubmitting]
  );

  const sendMessage = useCallback(async () => {
    const currentInput = state.composer.input;

    if (state.composer.isImageGenerationMode) {
      await sendImageMessage(currentInput);
      return;
    }

    await sendChatMessage(currentInput);
  }, [
    sendChatMessage,
    sendImageMessage,
    state.composer.input,
    state.composer.isImageGenerationMode,
  ]);

  const retryLastFailedPrompt = useCallback(async () => {
    if (!state.messages.lastFailedUserPrompt || state.request.isSubmitting) {
      return;
    }

    dispatch({ type: 'messages/remove-errors' });
    await sendChatMessage(state.messages.lastFailedUserPrompt);
  }, [sendChatMessage, state.messages.lastFailedUserPrompt, state.request.isSubmitting]);

  const stopPlayingAudio = useCallback(() => {
    releaseAudioResources();
    dispatch({ payload: null, type: 'audio/set-tts-loading-message-id' });
  }, [releaseAudioResources]);

  const playMessageAudio = useCallback(
    async (messageId: string, messageText: string) => {
      const trimmedText = messageText.trim();

      if (!trimmedText) {
        return;
      }

      if (state.audioPlayback.playingMessageId === messageId) {
        stopPlayingAudio();
        return;
      }

      stopPlayingAudio();
      dispatch({
        payload: messageId,
        type: 'audio/set-tts-loading-message-id',
      });

      try {
        const response = await fetch('/api/audio/speech', {
          body: JSON.stringify({ text: trimmedText }),
          headers: { 'content-type': 'application/json' },
          method: 'POST',
        });

        if (!response.ok) {
          const payload = await response.json();
          throw new Error(parseApiErrorMessage(payload) || 'TTS request failed.');
        }

        const blob = await response.blob();

        if (!blob.size) {
          throw new Error('No audio content received.');
        }

        const audioUrl = URL.createObjectURL(blob);
        const audioElement = new Audio(audioUrl);
        audioElementRef.current = audioElement;
        audioUrlRef.current = audioUrl;

        audioElement.onended = () => {
          releaseAudioResources();
        };

        dispatch({ payload: messageId, type: 'audio/set-playing-message-id' });
        await audioElement.play();
      } catch (error) {
        addErrorBubble(getErrorMessage(error));
        releaseAudioResources();
      } finally {
        dispatch({ payload: null, type: 'audio/set-tts-loading-message-id' });
      }
    },
    [addErrorBubble, releaseAudioResources, state.audioPlayback.playingMessageId, stopPlayingAudio]
  );

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
    [addErrorBubble]
  );

  const toggleRecording = useCallback(async () => {
    if (state.recording.isTranscribing) {
      return;
    }

    if (state.recording.isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    if (!navigator.mediaDevices || typeof MediaRecorder === 'undefined') {
      addErrorBubble('Audio recording is not supported in this browser.');
      return;
    }

    dispatch({ payload: '', type: 'feedback/set-error-message' });

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(mediaStream);

      recordedChunksRef.current = [];
      mediaStreamRef.current = mediaStream;
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        dispatch({ payload: false, type: 'recording/set-recording' });

        const audioBlob = new Blob(recordedChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });

        mediaStream.getTracks().forEach((track) => {
          track.stop();
        });

        mediaRecorderRef.current = null;
        mediaStreamRef.current = null;
        recordedChunksRef.current = [];

        if (!audioBlob.size) {
          return;
        }

        const audioFile = new File([audioBlob], 'recording.webm', {
          type: audioBlob.type || 'audio/webm',
        });
        const formData = new FormData();
        formData.append('audio', audioFile);

        dispatch({ payload: true, type: 'recording/set-transcribing' });

        try {
          const response = await fetch('/api/audio/transcriptions', {
            body: formData,
            method: 'POST',
          });

          if (!response.ok) {
            const payload = await response.json();
            throw new Error(parseApiErrorMessage(payload) || 'Unable to transcribe audio.');
          }

          const payload = await response.json();
          const parsedResponse = parseTranscriptionResponse(payload);

          if (parsedResponse.ok) {
            const nextInput = parsedResponse.data.text.trim();

            if (nextInput) {
              dispatch({ payload: nextInput, type: 'composer/set-input' });
            }
          }
        } catch (error) {
          const resolvedError = getErrorMessage(error);
          dispatch({ payload: resolvedError, type: 'feedback/set-error-message' });
          addErrorBubble(resolvedError);
        } finally {
          dispatch({ payload: false, type: 'recording/set-transcribing' });
        }
      };

      mediaRecorder.start();
      dispatch({ payload: true, type: 'recording/set-recording' });
    } catch {
      addErrorBubble('Unable to access your microphone.');
      dispatch({ payload: false, type: 'recording/set-recording' });
    }
  }, [addErrorBubble, state.recording.isRecording, state.recording.isTranscribing]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      isManualStopRequestedRef.current = false;

      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
      mediaRecorderRef.current = null;
      mediaStreamRef.current = null;
      recordedChunksRef.current = [];

      releaseAudioResources();

      if (copyFeedbackTimeoutRef.current) {
        window.clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, [releaseAudioResources]);

  const actions = useMemo<ChatProviderValue['actions']>(
    () => ({
      abortPendingRequest,
      addErrorBubble,
      clearLocalState,
      copyMessageText,
      playMessageAudio,
      resetFromInitialMessages,
      retryLastFailedPrompt,
      sendMessage,
      setInput: (nextInput: string) => {
        dispatch({ payload: nextInput, type: 'composer/set-input' });
      },
      setSelectedImageAspectRatio: (nextAspectRatio: ChatImageAspectRatio) => {
        dispatch({ payload: nextAspectRatio, type: 'composer/set-aspect-ratio' });
      },
      stopGeneration,
      stopPlayingAudio,
      toggleImageGenerationMode: () => {
        dispatch({ type: 'composer/toggle-image-mode' });
      },
      toggleRecording,
    }),
    [
      abortPendingRequest,
      addErrorBubble,
      clearLocalState,
      copyMessageText,
      playMessageAudio,
      resetFromInitialMessages,
      retryLastFailedPrompt,
      sendMessage,
      stopGeneration,
      stopPlayingAudio,
      toggleRecording,
    ]
  );

  const derived = useMemo(
    () => ({
      isEmptyState: state.messages.items.length === 0,
      isSendDisabled: state.request.isSubmitting || !state.composer.input.trim(),
    }),
    [state.composer.input, state.messages.items.length, state.request.isSubmitting]
  );

  return useMemo<ChatProviderValue>(
    () => ({
      actions,
      derived,
      state,
    }),
    [actions, derived, state]
  );
}

const ChatContext = createContext<ChatProviderValue | null>(null);

export function ChatProvider({ children, initialMessages }: ChatProviderProps) {
  const value = useChatProviderValue(initialMessages);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

function useChatContext(): ChatProviderValue {
  const context = use(ChatContext);

  if (!context) {
    throw new Error('Chat hooks must be used within ChatProvider.');
  }

  return context;
}

export function useChatMessages() {
  const { actions, derived, state } = useChatContext();

  return {
    copiedMessageId: state.feedback.copiedMessageId,
    copyMessageText: actions.copyMessageText,
    isEmptyState: derived.isEmptyState,
    messages: state.messages.items,
    retryLastFailedPrompt: actions.retryLastFailedPrompt,
  };
}

export function useChatRuntime() {
  const { actions, derived, state } = useChatContext();

  return {
    abortPendingRequest: actions.abortPendingRequest,
    addErrorBubble: actions.addErrorBubble,
    clearLocalState: actions.clearLocalState,
    errorMessage: state.feedback.errorMessage,
    isSendDisabled: derived.isSendDisabled,
    isSubmitting: state.request.isSubmitting,
    resetFromInitialMessages: actions.resetFromInitialMessages,
    sendMessage: actions.sendMessage,
    stopGeneration: actions.stopGeneration,
  };
}

export function useChatComposerState() {
  const { actions, state } = useChatContext();

  return {
    input: state.composer.input,
    isImageGenerationMode: state.composer.isImageGenerationMode,
    isRecording: state.recording.isRecording,
    isTranscribing: state.recording.isTranscribing,
    selectedImageAspectRatio: state.composer.selectedImageAspectRatio,
    setInput: actions.setInput,
    setSelectedImageAspectRatio: actions.setSelectedImageAspectRatio,
    toggleImageGenerationMode: actions.toggleImageGenerationMode,
    toggleRecording: actions.toggleRecording,
  };
}

export function useChatAudioActions() {
  const { actions, state } = useChatContext();

  return {
    playMessageAudio: actions.playMessageAudio,
    playingMessageId: state.audioPlayback.playingMessageId,
    stopPlayingAudio: actions.stopPlayingAudio,
    ttsLoadingMessageId: state.audioPlayback.ttsLoadingMessageId,
  };
}
