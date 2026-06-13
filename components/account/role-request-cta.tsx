'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useTransition, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export function RoleRequestCta() {
  const t = useTranslations('account.roleRequest');
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isSent) return;
    const timer = setTimeout(() => setIsSent(false), 4000);
    return () => clearTimeout(timer);
  }, [isSent]);

  function handleSubmit() {
    startTransition(async () => {
      try {
        const res = await fetch('/api/account/role-request', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ message: message || undefined }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error(data?.error?.message ?? t('errorToast'));
          return;
        }

        toast.success(t('successToast'));
        setIsSent(true);
        setIsOpen(false);
        setMessage('');
      } catch {
        toast.error(t('errorToast'));
      }
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={isSent} className="relative w-full">
          <span
            className={cn(
              'inline-flex items-center transition-all duration-200 ease-out motion-reduce:transition-none',
              isSent ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
            )}
            aria-hidden={isSent}
          >
            {t('title')}
          </span>
          <span
            className={cn(
              'absolute inset-0 inline-flex items-center justify-center transition-all duration-200 ease-out motion-reduce:transition-none',
              isSent ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
            )}
            aria-hidden={!isSent}
          >
            {t('sent')}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <label htmlFor="role-request-message" className="text-sm text-muted-foreground">
            {t('justificationLabel')}
          </label>
          <Textarea
            id="role-request-message"
            placeholder={t('justificationPlaceholder')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? t('sending') : t('submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
