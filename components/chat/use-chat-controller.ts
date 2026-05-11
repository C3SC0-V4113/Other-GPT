'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { ChatMessage } from '@/lib/chat-session-store';

interface UseChatControllerOptions {
  initialMessages: ChatMessage[];
}

export interface ChatUiMessage extends ChatMessage {
  id: string;
}

export interface ChatController {
  abortPendingRequest: () => void;
  clearLocalState: () => void;
  errorMessage: string;
  input: string;
  isEmptyState: boolean;
  isSendDisabled: boolean;
  isSubmitting: boolean;
  messages: ChatUiMessage[];
  resetFromInitialMessages: () => void;
  sendMessage: () => Promise<void>;
  setErrorMessage: (message: string) => void;
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
  };
}

export function useChatController({ initialMessages }: UseChatControllerOptions): ChatController {
  const [errorMessage, setErrorMessageState] = useState('');
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<ChatUiMessage[]>(() =>
    initialMessages.map((message, index) => toUiMessage(message, index))
  );

  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingAssistantMessageIdRef = useRef<string | null>(null);

  const isSendDisabled = useMemo(() => isSubmitting || !input.trim(), [input, isSubmitting]);
  const isEmptyState = messages.length === 0;

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
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

    const pendingAssistantMessageId = pendingAssistantMessageIdRef.current;
    pendingAssistantMessageIdRef.current = null;

    if (pendingAssistantMessageId) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== pendingAssistantMessageId)
      );
    }

    setIsSubmitting(false);
  };

  const clearLocalState = () => {
    abortPendingRequest();
    setErrorMessageState('');
    setInput('');
    setMessages([]);
  };

  const resetFromInitialMessages = () => {
    abortPendingRequest();
    setErrorMessageState('');
    setInput('');
    setMessages(initialMessages.map((message, index) => toUiMessage(message, index)));
  };

  const sendMessage = async () => {
    const trimmedInput = input.trim();

    if (!trimmedInput || isSubmitting) {
      return;
    }

    setErrorMessageState('');
    setIsSubmitting(true);
    setInput('');

    const requestMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();
    pendingAssistantMessageIdRef.current = assistantMessageId;

    setMessages((currentMessages) => [
      ...currentMessages,
      { content: trimmedInput, id: requestMessageId, role: 'user' },
      { content: '', id: assistantMessageId, role: 'assistant' },
    ]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

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
      let assistantContent = '';

      while (true) {
        const { done: isDone, value } = await reader.read();

        if (isDone) {
          break;
        }

        assistantContent += decoder.decode(value, { stream: true });

        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            message.id === assistantMessageId ? { ...message, content: assistantContent } : message
          )
        );
      }

      if (!assistantContent) {
        setMessages((currentMessages) =>
          currentMessages.filter((message) => message.id !== assistantMessageId)
        );
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      setErrorMessageState(getErrorMessage(error));
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== assistantMessageId)
      );
    } finally {
      abortControllerRef.current = null;
      pendingAssistantMessageIdRef.current = null;
      setIsSubmitting(false);
    }
  };

  return {
    abortPendingRequest,
    clearLocalState,
    errorMessage,
    input,
    isEmptyState,
    isSendDisabled,
    isSubmitting,
    messages,
    resetFromInitialMessages,
    sendMessage,
    setErrorMessage: setErrorMessageState,
    updateInput: setInput,
  };
}
