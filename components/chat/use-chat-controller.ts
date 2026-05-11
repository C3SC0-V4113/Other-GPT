'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { ChatMessage } from '@/lib/chat-session-store';

interface UseChatControllerOptions {
  initialMessages: ChatMessage[];
}

type ChatMessageKind = 'error' | 'message';
type ChatMessageStatus = 'complete' | 'error' | 'interrupted' | 'streaming';
type ChatMessageRole = 'assistant' | 'system' | 'user';

export interface ChatUiMessage {
  content: string;
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
  errorMessage: string;
  input: string;
  isEmptyState: boolean;
  isSendDisabled: boolean;
  isSubmitting: boolean;
  messages: ChatUiMessage[];
  retryLastFailedPrompt: () => Promise<void>;
  resetFromInitialMessages: () => void;
  sendMessage: () => Promise<void>;
  setErrorMessage: (message: string) => void;
  stopGeneration: () => void;
  updateInput: (nextInput: string) => void;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'An unexpected error occurred.';
}

function toUiMessage(message: ChatMessage, index: number): ChatUiMessage {
  return {
    ...message,
    id: `${message.role}-${index}`,
    kind: 'message',
    status: 'complete',
  };
}

export function useChatController({ initialMessages }: UseChatControllerOptions): ChatController {
  const [errorMessage, setErrorMessageState] = useState('');
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastFailedUserPrompt, setLastFailedUserPrompt] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatUiMessage[]>(() =>
    initialMessages.map((message, index) => toUiMessage(message, index))
  );

  const abortControllerRef = useRef<AbortController | null>(null);
  const isManualStopRequestedRef = useRef(false);
  const pendingAssistantMessageIdRef = useRef<string | null>(null);

  const isSendDisabled = useMemo(() => isSubmitting || !input.trim(), [input, isSubmitting]);
  const isEmptyState = messages.length === 0;

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      isManualStopRequestedRef.current = false;
      pendingAssistantMessageIdRef.current = null;
    };
  }, []);

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
    setErrorMessageState('');
    setInput('');
    setLastFailedUserPrompt(null);
    setMessages([]);
  };

  const resetFromInitialMessages = () => {
    abortPendingRequest();
    setErrorMessageState('');
    setInput('');
    setLastFailedUserPrompt(null);
    setMessages(initialMessages.map((message, index) => toUiMessage(message, index)));
  };

  const addErrorBubble = (message: string, options?: { retryPrompt?: string }) => {
    const errorMessageId = crypto.randomUUID();

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        content: message,
        id: errorMessageId,
        kind: 'error',
        retryPrompt: options?.retryPrompt,
        role: 'system',
        status: 'error',
      },
    ]);
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
        content: trimmedInput,
        id: requestMessageId,
        kind: 'message',
        role: 'user',
        status: 'complete',
      },
      {
        content: '',
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
              ? { ...message, content: assistantContent, status: 'streaming' }
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

  const sendMessage = async () => {
    await sendChatMessage(input);
  };

  const retryLastFailedPrompt = async () => {
    if (!lastFailedUserPrompt || isSubmitting) {
      return;
    }

    setMessages((currentMessages) => currentMessages.filter((message) => message.kind !== 'error'));
    await sendChatMessage(lastFailedUserPrompt);
  };

  return {
    addErrorBubble,
    abortPendingRequest,
    clearLocalState,
    errorMessage,
    input,
    isEmptyState,
    isSendDisabled,
    isSubmitting,
    messages,
    retryLastFailedPrompt,
    resetFromInitialMessages,
    sendMessage,
    setErrorMessage: setErrorMessageState,
    stopGeneration,
    updateInput: setInput,
  };
}
