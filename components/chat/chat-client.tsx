'use client';

import { Stone } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';

import type { ChatMessage } from '@/lib/chat-session-store';

interface ChatClientProps {
  initialMessages: ChatMessage[];
}

interface UiMessage extends ChatMessage {
  id: string;
}

function toUiMessage(message: ChatMessage, index: number): UiMessage {
  return {
    ...message,
    id: `${message.role}-${index}`,
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'An unexpected error occurred.';
}

export function ChatClient({ initialMessages }: ChatClientProps) {
  const [errorMessage, setErrorMessage] = useState('');
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>(() =>
    initialMessages.map((message, index) => toUiMessage(message, index))
  );
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollAreaRootRef = useRef<HTMLDivElement | null>(null);

  const isSendDisabled = useMemo(() => isSubmitting || !input.trim(), [input, isSubmitting]);
  const isEmptyState = messages.length === 0;

  useEffect(() => {
    const viewportElement = scrollAreaRootRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]'
    );

    if (viewportElement instanceof HTMLDivElement) {
      viewportElement.scrollTop = viewportElement.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    const trimmedInput = input.trim();

    if (!trimmedInput || isSubmitting) {
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);
    setInput('');

    const requestMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();

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

      setErrorMessage(getErrorMessage(error));
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== assistantMessageId)
      );
    } finally {
      abortControllerRef.current = null;
      setIsSubmitting(false);
    }
  };

  const handleClear = async () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsSubmitting(false);
    setErrorMessage('');

    const response = await fetch('/api/chat', { method: 'DELETE' });

    if (!response.ok) {
      setErrorMessage('Unable to clear the chat right now.');
      return;
    }

    setInput('');
    setMessages([]);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b bg-background/95">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Stone />
            <h1 className="text-base font-semibold tracking-tight">otro-GPT</h1>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void handleClear();
            }}
          >
            Eliminar
          </Button>
        </div>
      </header>

      <div ref={scrollAreaRootRef} className="min-h-0 flex-1">
        <ScrollArea className="size-full min-h-0">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6">
            {isEmptyState ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
                Start a conversation by typing your first message below.
              </div>
            ) : null}
            {messages.map((message) => (
              <article
                key={message.id}
                className={[
                  'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                  message.role === 'user'
                    ? 'ml-auto bg-primary text-primary-foreground'
                    : 'mr-auto border border-border bg-card text-card-foreground',
                ].join(' ')}
              >
                {message.content}
              </article>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="border-t bg-background/95">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-4 py-4">
          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
          >
            <Textarea
              name="message"
              placeholder="Send a message..."
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              disabled={isSubmitting}
              rows={1}
            />
            <Button type="submit" disabled={isSendDisabled}>
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
