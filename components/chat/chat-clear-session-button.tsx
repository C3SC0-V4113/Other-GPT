'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('clearSession');
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
      addErrorBubble(t('error'));
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          aria-label={t('ariaLabel')}
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
          <AlertDialogTitle>{t('title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isClearing}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            disabled={isClearing}
            onClick={() => {
              void handleClear();
            }}
          >
            {t('confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
