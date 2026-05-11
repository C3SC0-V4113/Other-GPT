'use client';

import { useChatControllerContext } from '@/components/chat/chat-controller-provider';

export function ChatErrorBanner() {
  const { errorMessage } = useChatControllerContext();

  if (!errorMessage) {
    return null;
  }

  return <p className="text-sm text-destructive">{errorMessage}</p>;
}
