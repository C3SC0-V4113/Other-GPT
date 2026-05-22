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
  useChatAttachmentsEffects,
  useChatAudioEffects,
  useChatClipboardEffects,
  useChatImageEffects,
  useChatRecordingEffects,
  useChatStreamEffects,
} from '@/components/chat/controller-effects';

import type {
  ChatActionHandlers,
  ChatAudioActionsContextValue,
  ChatComposerStateContextValue,
  ChatDerivedState,
  ChatMessagesContextValue,
  ChatProviderValue,
  ChatRuntimeContextValue,
} from '@/components/chat/chat-types';
import type { ChatAttachment } from '@/lib/chat-attachments';
import type { ChatImageAspectRatio, ChatMessage } from '@/lib/chat-session-store';

interface ChatProviderProps {
  children: ReactNode;
  initialAttachments: ChatAttachment[];
  initialMessages: ChatMessage[];
}

function releaseAttachmentPreviews(attachments: ChatAttachment[]): void {
  for (const attachment of attachments) {
    if (attachment.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
  }
}

function useChatProviderValue(
  initialMessages: ChatMessage[],
  initialAttachments: ChatAttachment[]
): ChatProviderValue {
  const [state, dispatch] = useReducer(
    chatControllerReducer,
    { initialAttachments, initialMessages },
    (initial) => createInitialChatState(initial.initialMessages, initial.initialAttachments)
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
    composer: {
      attachments: state.composer.attachments,
    },
    deps: {
      addErrorBubble,
      dispatch,
    },
    options: {
      isManualStopRetryEnabled: true,
    },
    refs: {
      isManualStopRequestedRef,
      requestAbortControllerRef,
    },
    request: {
      isSubmitting: state.request.isSubmitting,
      pendingAssistantMessageId: state.request.pendingAssistantMessageId,
    },
  });

  const { sendImageMessage } = useChatImageEffects({
    composer: {
      attachments: state.composer.attachments,
      selectedImageAspectRatio: state.composer.selectedImageAspectRatio,
    },
    deps: {
      dispatch,
    },
    refs: {
      isManualStopRequestedRef,
      requestAbortControllerRef,
    },
    request: {
      isSubmitting: state.request.isSubmitting,
    },
  });

  const {
    addFilesAsAttachments,
    removeAttachment: removeAttachmentEffect,
    setAttachmentIncludedInContext: setAttachmentIncludedInContextEffect,
  } = useChatAttachmentsEffects({
    composer: {
      attachments: state.composer.attachments,
    },
    deps: {
      dispatch,
    },
    request: {
      isSubmitting: state.request.isSubmitting,
    },
  });

  const { copyMessageText } = useChatClipboardEffects({
    deps: {
      addErrorBubble,
      dispatch,
    },
    refs: {
      copyFeedbackTimeoutRef,
    },
  });

  const { playMessageAudio, releaseAudioResources, stopPlayingAudio } = useChatAudioEffects({
    deps: {
      addErrorBubble,
      dispatch,
    },
    refs: {
      audioElementRef,
      audioUrlRef,
    },
    runtime: {
      playingMessageId: state.audioPlayback.playingMessageId,
    },
  });

  const { toggleRecording } = useChatRecordingEffects({
    deps: {
      addErrorBubble,
      dispatch,
    },
    recording: {
      isRecording: state.recording.isRecording,
      isTranscribing: state.recording.isTranscribing,
    },
    refs: {
      mediaRecorderRef,
      mediaStreamRef,
      recordedChunksRef,
    },
  });

  const clearLocalState = useCallback(() => {
    abortPendingRequest();
    releaseAudioResources();
    releaseAttachmentPreviews(state.composer.attachments);
    dispatch({ type: 'messages/clear-all' });
  }, [abortPendingRequest, releaseAudioResources, state.composer.attachments]);

  const resetFromInitialMessages = useCallback(() => {
    abortPendingRequest();
    releaseAudioResources();
    releaseAttachmentPreviews(state.composer.attachments);
    dispatch({ payload: initialMessages, type: 'messages/hydrate' });
    dispatch({ payload: initialAttachments, type: 'composer/set-attachments' });
  }, [
    abortPendingRequest,
    initialAttachments,
    initialMessages,
    releaseAudioResources,
    state.composer.attachments,
  ]);

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
    const lastFailedRequest = state.messages.lastFailedRequest;

    if (!lastFailedRequest || state.request.isSubmitting) {
      return;
    }

    dispatch({ type: 'messages/remove-errors' });

    if (lastFailedRequest.kind === 'image') {
      dispatch({
        payload: lastFailedRequest.aspectRatio ?? 'auto',
        type: 'composer/set-aspect-ratio',
      });
      await sendImageMessage(lastFailedRequest.prompt);
      return;
    }

    await sendChatMessage({ trimmedInput: lastFailedRequest.prompt });
  }, [
    dispatch,
    sendChatMessage,
    sendImageMessage,
    state.messages.lastFailedRequest,
    state.request.isSubmitting,
  ]);

  const clearCopyFeedbackTimeout = useCallback(() => {
    const timeoutId = copyFeedbackTimeoutRef.current;

    if (!timeoutId) {
      return;
    }

    window.clearTimeout(timeoutId);
    copyFeedbackTimeoutRef.current = null;
  }, []);

  const removeAttachment = useCallback(
    async (attachmentId: string) => {
      const attachment = state.composer.attachments.find(
        (candidate) => candidate.id === attachmentId
      );
      const didRemoveAttachment = await removeAttachmentEffect(attachmentId);

      if (didRemoveAttachment && attachment?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(attachment.previewUrl);
      }

      return didRemoveAttachment;
    },
    [removeAttachmentEffect, state.composer.attachments]
  );

  const setAttachmentIncludedInContext = useCallback(
    async (attachmentId: string, isIncludedInContext: boolean) =>
      setAttachmentIncludedInContextEffect(attachmentId, isIncludedInContext),
    [setAttachmentIncludedInContextEffect]
  );

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
      releaseAttachmentPreviews(state.composer.attachments);
    };
  }, [clearCopyFeedbackTimeout, releaseAudioResources, state.composer.attachments]);

  const actions = useMemo<ChatActionHandlers>(
    () => ({
      abortPendingRequest,
      addErrorBubble,
      addFilesAsAttachments,
      clearLocalState,
      copyMessageText,
      playMessageAudio,
      removeAttachment,
      resetFromInitialMessages,
      retryLastFailedPrompt,
      sendMessage,
      setAttachmentIncludedInContext,
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
      addFilesAsAttachments,
      clearLocalState,
      copyMessageText,
      dispatch,
      playMessageAudio,
      removeAttachment,
      resetFromInitialMessages,
      retryLastFailedPrompt,
      sendMessage,
      setAttachmentIncludedInContext,
      stopGeneration,
      stopPlayingAudio,
      toggleRecording,
    ]
  );

  const derived = useMemo<ChatDerivedState>(
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

const ChatMessagesContext = createContext<ChatMessagesContextValue | null>(null);
const ChatRuntimeContext = createContext<ChatRuntimeContextValue | null>(null);
const ChatComposerStateContext = createContext<ChatComposerStateContextValue | null>(null);
const ChatAudioActionsContext = createContext<ChatAudioActionsContextValue | null>(null);

export function ChatProvider({ children, initialAttachments, initialMessages }: ChatProviderProps) {
  const value = useChatProviderValue(initialMessages, initialAttachments);
  const { actions, derived, state } = value;

  const messagesValue = useMemo<ChatMessagesContextValue>(
    () => ({
      copiedMessageId: state.feedback.copiedMessageId,
      copyMessageText: actions.copyMessageText,
      isEmptyState: derived.isEmptyState,
      messages: state.messages.items,
      retryLastFailedPrompt: actions.retryLastFailedPrompt,
    }),
    [
      actions.copyMessageText,
      actions.retryLastFailedPrompt,
      derived.isEmptyState,
      state.feedback.copiedMessageId,
      state.messages.items,
    ]
  );

  const runtimeValue = useMemo<ChatRuntimeContextValue>(
    () => ({
      abortPendingRequest: actions.abortPendingRequest,
      addErrorBubble: actions.addErrorBubble,
      clearLocalState: actions.clearLocalState,
      errorMessage: state.feedback.errorMessage,
      isSubmitting: state.request.isSubmitting,
      resetFromInitialMessages: actions.resetFromInitialMessages,
      sendMessage: actions.sendMessage,
      stopGeneration: actions.stopGeneration,
    }),
    [
      actions.abortPendingRequest,
      actions.addErrorBubble,
      actions.clearLocalState,
      actions.resetFromInitialMessages,
      actions.sendMessage,
      actions.stopGeneration,
      state.feedback.errorMessage,
      state.request.isSubmitting,
    ]
  );

  const composerStateValue = useMemo<ChatComposerStateContextValue>(
    () => ({
      addFilesAsAttachments: actions.addFilesAsAttachments,
      attachments: state.composer.attachments,
      input: state.composer.input,
      isImageGenerationMode: state.composer.isImageGenerationMode,
      isRecording: state.recording.isRecording,
      isSendDisabled: derived.isSendDisabled,
      isSubmitting: state.request.isSubmitting,
      isTranscribing: state.recording.isTranscribing,
      removeAttachment: actions.removeAttachment,
      setAttachmentIncludedInContext: actions.setAttachmentIncludedInContext,
      selectedImageAspectRatio: state.composer.selectedImageAspectRatio,
      setInput: actions.setInput,
      setSelectedImageAspectRatio: actions.setSelectedImageAspectRatio,
      toggleImageGenerationMode: actions.toggleImageGenerationMode,
      toggleRecording: actions.toggleRecording,
    }),
    [
      actions.addFilesAsAttachments,
      actions.removeAttachment,
      actions.setAttachmentIncludedInContext,
      actions.setInput,
      actions.setSelectedImageAspectRatio,
      actions.toggleImageGenerationMode,
      actions.toggleRecording,
      derived.isSendDisabled,
      state.composer.attachments,
      state.composer.input,
      state.composer.isImageGenerationMode,
      state.composer.selectedImageAspectRatio,
      state.recording.isRecording,
      state.recording.isTranscribing,
      state.request.isSubmitting,
    ]
  );

  const audioActionsValue = useMemo<ChatAudioActionsContextValue>(
    () => ({
      playMessageAudio: actions.playMessageAudio,
      playingMessageId: state.audioPlayback.playingMessageId,
      stopPlayingAudio: actions.stopPlayingAudio,
      ttsLoadingMessageId: state.audioPlayback.ttsLoadingMessageId,
    }),
    [
      actions.playMessageAudio,
      actions.stopPlayingAudio,
      state.audioPlayback.playingMessageId,
      state.audioPlayback.ttsLoadingMessageId,
    ]
  );

  return (
    <ChatRuntimeContext.Provider value={runtimeValue}>
      <ChatComposerStateContext.Provider value={composerStateValue}>
        <ChatMessagesContext.Provider value={messagesValue}>
          <ChatAudioActionsContext.Provider value={audioActionsValue}>
            {children}
          </ChatAudioActionsContext.Provider>
        </ChatMessagesContext.Provider>
      </ChatComposerStateContext.Provider>
    </ChatRuntimeContext.Provider>
  );
}

export function useChatMessages() {
  const context = use(ChatMessagesContext);

  if (!context) {
    throw new Error('useChatMessages must be used within ChatProvider.');
  }

  return context;
}

export function useChatRuntime() {
  const context = use(ChatRuntimeContext);

  if (!context) {
    throw new Error('useChatRuntime must be used within ChatProvider.');
  }

  return context;
}

export function useChatComposerState() {
  const context = use(ChatComposerStateContext);

  if (!context) {
    throw new Error('useChatComposerState must be used within ChatProvider.');
  }

  return context;
}

export function useChatAudioActions() {
  const context = use(ChatAudioActionsContext);

  if (!context) {
    throw new Error('useChatAudioActions must be used within ChatProvider.');
  }

  return context;
}
