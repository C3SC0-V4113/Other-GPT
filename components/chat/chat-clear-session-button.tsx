'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useChatRuntime } from '@/components/chat/chat-controller-provider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          aria-label="Borrar sesion actual"
          className="shadow-sm"
          disabled={isClearing || isSubmitting}
          size="icon-sm"
          type="button"
          variant="destructive"
        >
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Borrar sesion actual</AlertDialogTitle>
          <AlertDialogDescription>
            Esta accion borrara la conversacion actual y tambien eliminara cualquier archivo adjunto
            asociado a este chat. No se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isClearing}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={isClearing}
            onClick={() => {
              void handleClear();
            }}
          >
            Borrar sesion
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
