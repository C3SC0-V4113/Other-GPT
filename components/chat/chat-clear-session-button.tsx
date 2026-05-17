'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useChatRuntime } from '@/components/chat/chat-controller-provider';
import { Button } from '@/components/ui/button';

export function ChatClearSessionButton() {
  const { refresh } = useRouter();
  const [isClearing, setIsClearing] = useState(false);
  const { abortPendingRequest, addErrorBubble, clearLocalState, isSubmitting } = useChatRuntime();

  const handleClear = async () => {
    if (isClearing) {
      return;
    }

    setIsClearing(true);
    abortPendingRequest();

    try {
      const response = await fetch('/api/chat', { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Unable to clear the chat right now.');
      }

      clearLocalState();
      refresh();
    } catch {
      addErrorBubble('Unable to clear the chat right now.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={isClearing || isSubmitting}
      onClick={() => {
        void handleClear();
      }}
    >
      <Trash2 data-icon="inline-start" />
      Eliminar
    </Button>
  );
}
