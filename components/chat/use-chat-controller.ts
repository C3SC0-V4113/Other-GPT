'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  ChatImageAspectRatio,
  ChatImageMessageContent,
  ChatMessage,
  ChatTextMessageContent,
} from '@/lib/chat-session-store';

interface UseChatControllerOptions {
  initialMessages: ChatMessage[];
}

type ChatMessageKind = 'error' | 'message';
type ChatMessageStatus = 'complete' | 'error' | 'interrupted' | 'streaming';
type ChatMessageRole = 'assistant' | 'system' | 'user';

export type ChatUiMessageContent = ChatImageMessageContent | ChatTextMessageContent;

export interface ChatUiMessage {
  content: ChatUiMessageContent;
  id: string;
  kind: ChatMessageKind;
  retryPrompt?: string;
  role: ChatMessageRole;
  status: ChatMessageStatus;
}

export interface ChatController {
  addErrorBubble: (message: string, options?: { retryPrompt?: string }) => void;
  abortPendingRequest: () => void;
  clearLocalState: () => void;
  copiedMessageId: string | null;
  copyMessageText: (messageId: string, messageText: string) => Promise<void>;
  errorMessage: string;
  isImageGenerationMode: boolean;
  input: string;
  isEmptyState: boolean;
  isRecording: boolean;
  isSendDisabled: boolean;
  isSubmitting: boolean;
  isTranscribing: boolean;
  messages: ChatUiMessage[];
  playingMessageId: string | null;
  retryLastFailedPrompt: () => Promise<void>;
  resetFromInitialMessages: () => void;
  selectedImageAspectRatio: ChatImageAspectRatio;
  sendMessage: () => Promise<void>;
  setErrorMessage: (message: string) => void;
  stopGeneration: () => void;
  stopPlayingAudio: () => void;
  toggleImageGenerationMode: () => void;
  toggleRecording: () => Promise<void>;
  ttsLoadingMessageId: string | null;
  updateInput: (nextInput: string) => void;
  updateSelectedImageAspectRatio: (nextAspectRatio: ChatImageAspectRatio) => void;
  playMessageAudio: (messageId: string, messageText: string) => Promise<void>;
}

interface GenerateImageResponse {
  aspectRatio?: unknown;
  imageBase64?: unknown;
  mimeType?: unknown;
  prompt?: unknown;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'An unexpected error occurred.';
}

function toUiMessage(message: ChatMessage, index: number): ChatUiMessage {
  return {
    content: message.content,
    id: `${message.role}-${index}`,
    kind: 'message',
    role: message.role,
    status: 'complete',
  };
}

function isGenerateImageResponse(payload: unknown): payload is {
  aspectRatio: ChatImageAspectRatio;
  imageBase64: string;
  mimeType: string;
  prompt: string;
} {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const candidate = payload as GenerateImageResponse;

  const hasAspectRatio =
    candidate.aspectRatio === 'auto' ||
    candidate.aspectRatio === '1:1' ||
    candidate.aspectRatio === '16:9' ||
    candidate.aspectRatio === '9:16';

  return (
    hasAspectRatio &&
    typeof candidate.imageBase64 === 'string' &&
    typeof candidate.mimeType === 'string' &&
    typeof candidate.prompt === 'string'
  );
}

export function useChatController({ initialMessages }: UseChatControllerOptions): ChatController {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [errorMessage, setErrorMessageState] = useState('');
  const [isImageGenerationMode, setIsImageGenerationMode] = useState(false);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [lastFailedUserPrompt, setLastFailedUserPrompt] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatUiMessage[]>(() =>
    initialMessages.map((message, index) => toUiMessage(message, index))
  );
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [selectedImageAspectRatio, setSelectedImageAspectRatio] =
    useState<ChatImageAspectRatio>('auto');
  const [ttsLoadingMessageId, setTtsLoadingMessageId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const copyFeedbackTimeoutRef = useRef<number | null>(null);
  const isManualStopRequestedRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const pendingAssistantMessageIdRef = useRef<string | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  const isSendDisabled = useMemo(() => isSubmitting || !input.trim(), [input, isSubmitting]);
  const isEmptyState = messages.length === 0;

  const releaseAudioResources = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = '';
      audioElementRef.current = null;
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    setPlayingMessageId(null);
  };

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      isManualStopRequestedRef.current = false;
      pendingAssistantMessageIdRef.current = null;

      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
      mediaRecorderRef.current = null;
      mediaStreamRef.current = null;
      setIsRecording(false);

      releaseAudioResources();

      if (copyFeedbackTimeoutRef.current) {
        window.clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const addErrorBubble = (message: string, options?: { retryPrompt?: string }) => {
    const errorMessageId = crypto.randomUUID();

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        content: { text: message, type: 'text' },
        id: errorMessageId,
        kind: 'error',
        retryPrompt: options?.retryPrompt,
        role: 'system',
        status: 'error',
      },
    ]);
  };

  const abortPendingRequest = () => {
    const controller = abortControllerRef.current;

    if (!controller) {
      return;
    }

    controller.abort();
    abortControllerRef.current = null;
    isManualStopRequestedRef.current = false;

    const pendingAssistantMessageId = pendingAssistantMessageIdRef.current;
    pendingAssistantMessageIdRef.current = null;

    if (pendingAssistantMessageId) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== pendingAssistantMessageId)
      );
    }

    setIsSubmitting(false);
  };

  const stopGeneration = () => {
    const controller = abortControllerRef.current;

    if (!controller) {
      return;
    }

    isManualStopRequestedRef.current = true;
    controller.abort();
    abortControllerRef.current = null;
    setIsSubmitting(false);
  };

  const clearLocalState = () => {
    abortPendingRequest();
    setCopiedMessageId(null);
    setErrorMessageState('');
    setIsImageGenerationMode(false);
    setInput('');
    setLastFailedUserPrompt(null);
    setMessages([]);
    releaseAudioResources();
  };

  const resetFromInitialMessages = () => {
    abortPendingRequest();
    setCopiedMessageId(null);
    setErrorMessageState('');
    setIsImageGenerationMode(false);
    setInput('');
    setLastFailedUserPrompt(null);
    setMessages(initialMessages.map((message, index) => toUiMessage(message, index)));
    releaseAudioResources();
  };

  const sendChatMessage = async (rawInput: string) => {
    const trimmedInput = rawInput.trim();

    if (!trimmedInput || isSubmitting) {
      return;
    }

    setErrorMessageState('');
    setIsSubmitting(true);
    setInput('');

    const requestMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();
    isManualStopRequestedRef.current = false;
    pendingAssistantMessageIdRef.current = assistantMessageId;

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        content: { text: trimmedInput, type: 'text' },
        id: requestMessageId,
        kind: 'message',
        role: 'user',
        status: 'complete',
      },
      {
        content: { text: '', type: 'text' },
        id: assistantMessageId,
        kind: 'message',
        role: 'assistant',
        status: 'streaming',
      },
    ]);

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
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || 'Request failed.');
      }

      if (!response.body) {
        throw new Error('No response stream available.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done: isDone, value } = await reader.read();

        if (isDone) {
          break;
        }

        assistantContent += decoder.decode(value, { stream: true });

        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  content: { text: assistantContent, type: 'text' },
                  status: 'streaming',
                }
              : message
          )
        );
      }

      if (!assistantContent) {
        setMessages((currentMessages) =>
          currentMessages.filter((message) => message.id !== assistantMessageId)
        );
      } else {
        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            message.id === assistantMessageId ? { ...message, status: 'complete' } : message
          )
        );
      }

      setLastFailedUserPrompt(null);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        if (isManualStopRequestedRef.current) {
          setLastFailedUserPrompt(trimmedInput);

          if (!assistantContent) {
            setMessages((currentMessages) =>
              currentMessages.filter((message) => message.id !== assistantMessageId)
            );
          } else {
            setMessages((currentMessages) =>
              currentMessages.map((message) =>
                message.id === assistantMessageId
                  ? { ...message, retryPrompt: trimmedInput, status: 'interrupted' }
                  : message
              )
            );
          }
        }

        return;
      }

      setErrorMessageState(getErrorMessage(error));
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== assistantMessageId)
      );
      setLastFailedUserPrompt(trimmedInput);
      addErrorBubble(getErrorMessage(error), { retryPrompt: trimmedInput });
    } finally {
      abortControllerRef.current = null;
      isManualStopRequestedRef.current = false;
      pendingAssistantMessageIdRef.current = null;
      setIsSubmitting(false);
    }
  };

  const sendImageMessage = async (rawInput: string) => {
    const trimmedInput = rawInput.trim();

    if (!trimmedInput || isSubmitting) {
      return;
    }

    setErrorMessageState('');
    setIsSubmitting(true);
    setInput('');
    isManualStopRequestedRef.current = false;

    const controller = new AbortController();
    abortControllerRef.current = controller;

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
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || 'Image request failed.');
      }

      const payload = (await response.json()) as unknown;

      if (!isGenerateImageResponse(payload)) {
        throw new Error('Invalid image response received.');
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          content: { text: trimmedInput, type: 'text' },
          id: crypto.randomUUID(),
          kind: 'message',
          role: 'user',
          status: 'complete',
        },
        {
          content: {
            aspectRatio: payload.aspectRatio,
            imageBase64: payload.imageBase64,
            mimeType: payload.mimeType,
            prompt: payload.prompt,
            type: 'image',
          },
          id: crypto.randomUUID(),
          kind: 'message',
          role: 'assistant',
          status: 'complete',
        },
      ]);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      const resolvedError = getErrorMessage(error);
      setErrorMessageState(resolvedError);
      addErrorBubble(resolvedError);
    } finally {
      abortControllerRef.current = null;
      isManualStopRequestedRef.current = false;
      setIsSubmitting(false);
    }
  };

  const sendMessage = async () => {
    if (isImageGenerationMode) {
      await sendImageMessage(input);
      return;
    }

    await sendChatMessage(input);
  };

  const retryLastFailedPrompt = async () => {
    if (!lastFailedUserPrompt || isSubmitting) {
      return;
    }

    setMessages((currentMessages) => currentMessages.filter((message) => message.kind !== 'error'));
    await sendChatMessage(lastFailedUserPrompt);
  };

  const toggleImageGenerationMode = () => {
    setIsImageGenerationMode((currentValue) => !currentValue);
  };

  const stopPlayingAudio = () => {
    releaseAudioResources();
    setTtsLoadingMessageId(null);
  };

  const playMessageAudio = async (messageId: string, messageText: string) => {
    const trimmedText = messageText.trim();

    if (!trimmedText) {
      return;
    }

    if (playingMessageId === messageId) {
      stopPlayingAudio();
      return;
    }

    stopPlayingAudio();
    setTtsLoadingMessageId(messageId);

    try {
      const response = await fetch('/api/audio/speech', {
        body: JSON.stringify({ text: trimmedText }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || 'TTS request failed.');
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

      setPlayingMessageId(messageId);
      await audioElement.play();
    } catch (error) {
      addErrorBubble(getErrorMessage(error));
      releaseAudioResources();
    } finally {
      setTtsLoadingMessageId(null);
    }
  };

  const copyMessageText = async (messageId: string, messageText: string) => {
    if (!messageText.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(messageText);
      setCopiedMessageId(messageId);

      if (copyFeedbackTimeoutRef.current) {
        window.clearTimeout(copyFeedbackTimeoutRef.current);
      }

      copyFeedbackTimeoutRef.current = window.setTimeout(() => {
        setCopiedMessageId((currentId) => (currentId === messageId ? null : currentId));
      }, 1800);
    } catch {
      addErrorBubble('Unable to copy the message right now.');
    }
  };

  const toggleRecording = async () => {
    if (isTranscribing) {
      return;
    }

    if (isRecording) {
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

    setErrorMessageState('');

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
        setIsRecording(false);

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

        setIsTranscribing(true);

        try {
          const response = await fetch('/api/audio/transcriptions', {
            body: formData,
            method: 'POST',
          });

          if (!response.ok) {
            const payload = (await response.json()) as { error?: string };
            throw new Error(payload.error || 'Unable to transcribe audio.');
          }

          const payload = (await response.json()) as { text?: unknown };
          const transcribedText = typeof payload.text === 'string' ? payload.text.trim() : '';

          if (transcribedText) {
            setInput(transcribedText);
          }
        } catch (error) {
          const resolvedError = getErrorMessage(error);
          setErrorMessageState(resolvedError);
          addErrorBubble(resolvedError);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      addErrorBubble('Unable to access your microphone.');
      setIsRecording(false);
    }
  };

  return {
    addErrorBubble,
    abortPendingRequest,
    clearLocalState,
    copiedMessageId,
    copyMessageText,
    errorMessage,
    isImageGenerationMode,
    input,
    isEmptyState,
    isRecording,
    isSendDisabled,
    isSubmitting,
    isTranscribing,
    messages,
    playMessageAudio,
    playingMessageId,
    retryLastFailedPrompt,
    resetFromInitialMessages,
    selectedImageAspectRatio,
    sendMessage,
    setErrorMessage: setErrorMessageState,
    stopGeneration,
    stopPlayingAudio,
    toggleImageGenerationMode,
    toggleRecording,
    ttsLoadingMessageId,
    updateInput: setInput,
    updateSelectedImageAspectRatio: setSelectedImageAspectRatio,
  };
}
