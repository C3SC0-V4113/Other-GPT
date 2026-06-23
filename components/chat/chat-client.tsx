'use client';

import {
  CallInteractionBoundary,
  CallInteractionLockSynchronizer,
} from '@/components/call-interaction-lock';
import { ChatComposerForm } from '@/components/chat/chat-composer-form';
import { ChatComposerProvider } from '@/components/chat/chat-composer-provider';
import { ChatProvider, useChatVoiceActions } from '@/components/chat/chat-controller-provider';
import { ChatMessagesView } from '@/components/chat/chat-messages-view';
import { TooltipProvider } from '@/components/ui/tooltip';

import type { ChatAttachment } from '@/lib/chat-attachments';
import type { ChatMessage } from '@/lib/chat-session-store';

interface ChatClientProps {
  canGenerateImages: boolean;
  canUseRealtimeVoice: boolean;
  initialAttachments: ChatAttachment[];
  initialMessages: ChatMessage[];
}

function ChatInteractionRegions({
  canGenerateImages,
  canUseRealtimeVoice,
}: Pick<ChatClientProps, 'canGenerateImages' | 'canUseRealtimeVoice'>) {
  const { status } = useChatVoiceActions();

  return (
    <>
      <CallInteractionLockSynchronizer status={status} />
      <TooltipProvider>
        <div className="flex min-h-0 flex-1 flex-col">
          <CallInteractionBoundary className="flex min-h-0 flex-1 flex-col">
            <ChatMessagesView />
          </CallInteractionBoundary>

          <div className="border-t bg-background/95">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 p-4">
              <ChatComposerProvider>
                <ChatComposerForm
                  canGenerateImages={canGenerateImages}
                  canUseRealtimeVoice={canUseRealtimeVoice}
                />
              </ChatComposerProvider>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </>
  );
}

export function ChatClient({
  canGenerateImages,
  canUseRealtimeVoice,
  initialAttachments,
  initialMessages,
}: ChatClientProps) {
  return (
    <ChatProvider initialAttachments={initialAttachments} initialMessages={initialMessages}>
      <ChatInteractionRegions
        canGenerateImages={canGenerateImages}
        canUseRealtimeVoice={canUseRealtimeVoice}
      />
    </ChatProvider>
  );
}
