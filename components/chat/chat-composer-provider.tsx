'use client';

import { createContext, use, useMemo, type ReactNode } from 'react';

import { useChatComposerState, useChatRuntime } from '@/components/chat/chat-controller-provider';

import type { ChatImageAspectRatio } from '@/lib/chat-session-store';

interface ChatComposerProviderProps {
  children: ReactNode;
}

interface ChatComposerContextValue {
  input: string;
  isImageGenerationMode: boolean;
  isRecording: boolean;
  isSendDisabled: boolean;
  isSubmitting: boolean;
  isTranscribing: boolean;
  selectedImageAspectRatio: ChatImageAspectRatio;
  sendMessage: () => Promise<void>;
  setInput: (nextInput: string) => void;
  setSelectedImageAspectRatio: (nextAspectRatio: ChatImageAspectRatio) => void;
  stopGeneration: () => void;
  toggleImageGenerationMode: () => void;
  toggleRecording: () => Promise<void>;
}

const ChatComposerContext = createContext<ChatComposerContextValue | null>(null);

export function ChatComposerProvider({ children }: ChatComposerProviderProps) {
  const composer = useChatComposerState();
  const runtime = useChatRuntime();

  const value = useMemo<ChatComposerContextValue>(
    () => ({
      input: composer.input,
      isImageGenerationMode: composer.isImageGenerationMode,
      isRecording: composer.isRecording,
      isSendDisabled: runtime.isSendDisabled,
      isSubmitting: runtime.isSubmitting,
      isTranscribing: composer.isTranscribing,
      selectedImageAspectRatio: composer.selectedImageAspectRatio,
      sendMessage: runtime.sendMessage,
      setInput: composer.setInput,
      setSelectedImageAspectRatio: composer.setSelectedImageAspectRatio,
      stopGeneration: runtime.stopGeneration,
      toggleImageGenerationMode: composer.toggleImageGenerationMode,
      toggleRecording: composer.toggleRecording,
    }),
    [composer, runtime]
  );

  return <ChatComposerContext.Provider value={value}>{children}</ChatComposerContext.Provider>;
}

export function useChatComposer() {
  const context = use(ChatComposerContext);

  if (!context) {
    throw new Error('useChatComposer must be used within ChatComposerProvider.');
  }

  return context;
}
