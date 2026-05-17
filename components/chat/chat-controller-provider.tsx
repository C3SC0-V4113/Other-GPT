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
import { useChatAudioEffects } from '@/components/chat/use-chat-audio-effects';
import { useChatClipboardEffects } from '@/components/chat/use-chat-clipboard-effects';
import { useChatImageEffects } from '@/components/chat/use-chat-image-effects';
import { useChatRecordingEffects } from '@/components/chat/use-chat-recording-effects';
import { useChatStreamEffects } from '@/components/chat/use-chat-stream-effects';

import type { ChatProviderValue } from '@/components/chat/chat-types';
import type { ChatImageAspectRatio, ChatMessage } from '@/lib/chat-session-store';

interface ChatProviderProps {
  children: ReactNode;
  initialMessages: ChatMessage[];
}

function useChatProviderValue(initialMessages: ChatMessage[]): ChatProviderValue {
  const [state, dispatch] = useReducer(
    chatControllerReducer,
    initialMessages,
    createInitialChatState
  );

  const requestAbortControllerRef = useRef<AbortController | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const copyFeedbackTimeoutRef = useRef<number | null>(null);
  const isManualStopRequestedRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

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

  const { abortPendingRequest, sendChatMessage, stopGeneration } = useChatStreamEffects({
    addErrorBubble,
    addInterruptedStateOnManualStop: true,
    dispatch,
    isManualStopRequestedRef,
    isSubmitting: state.request.isSubmitting,
    pendingAssistantMessageId: state.request.pendingAssistantMessageId,
    requestAbortControllerRef,
  });

  const { sendImageMessage } = useChatImageEffects({
    addErrorBubble: (message) => {
      addErrorBubble(message);
    },
    dispatch,
    isSubmitting: state.request.isSubmitting,
    isManualStopRequestedRef,
    requestAbortControllerRef,
    selectedImageAspectRatio: state.composer.selectedImageAspectRatio,
  });

  const { copyMessageText } = useChatClipboardEffects({
    addErrorBubble: (message) => {
      addErrorBubble(message);
    },
    copyFeedbackTimeoutRef,
    dispatch,
  });

  const { playMessageAudio, releaseAudioResources, stopPlayingAudio } = useChatAudioEffects({
    addErrorBubble: (message) => {
      addErrorBubble(message);
    },
    audioElementRef,
    audioUrlRef,
    dispatch,
    playingMessageId: state.audioPlayback.playingMessageId,
  });

  const { toggleRecording } = useChatRecordingEffects({
    addErrorBubble: (message) => {
      addErrorBubble(message);
    },
    dispatch,
    isRecording: state.recording.isRecording,
    isTranscribing: state.recording.isTranscribing,
    mediaRecorderRef,
    mediaStreamRef,
    recordedChunksRef,
  });

  const clearLocalState = useCallback(() => {
    abortPendingRequest();
    releaseAudioResources();
    dispatch({ type: 'messages/clear-all' });
  }, [abortPendingRequest, dispatch, releaseAudioResources]);

  const resetFromInitialMessages = useCallback(() => {
    abortPendingRequest();
    releaseAudioResources();
    dispatch({ payload: initialMessages, type: 'messages/hydrate' });
  }, [abortPendingRequest, dispatch, initialMessages, releaseAudioResources]);

  const sendMessage = useCallback(async () => {
    const trimmedInput = state.composer.input.trim();

    if (state.composer.isImageGenerationMode) {
      await sendImageMessage(trimmedInput);
      return;
    }

    await sendChatMessage({ trimmedInput });
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
    await sendChatMessage({ trimmedInput: state.messages.lastFailedUserPrompt });
  }, [dispatch, sendChatMessage, state.messages.lastFailedUserPrompt, state.request.isSubmitting]);

  const clearCopyFeedbackTimeout = useCallback(() => {
    const timeoutId = copyFeedbackTimeoutRef.current;

    if (!timeoutId) {
      return;
    }

    window.clearTimeout(timeoutId);
    copyFeedbackTimeoutRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      requestAbortControllerRef.current?.abort();
      requestAbortControllerRef.current = null;
      isManualStopRequestedRef.current = false;

      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
      mediaRecorderRef.current = null;
      mediaStreamRef.current = null;
      recordedChunksRef.current = [];

      releaseAudioResources();
      clearCopyFeedbackTimeout();
    };
  }, [clearCopyFeedbackTimeout, releaseAudioResources]);

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
      dispatch,
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
