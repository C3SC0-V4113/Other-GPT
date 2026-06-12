'use client';

import { useTranslations } from 'next-intl';
import { useTransition, useState } from 'react';
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

export function RoleRequestCta() {
  const t = useTranslations('account.roleRequest');
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isPending, startTransition] = useTransition();

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
      } catch {
        toast.error(t('errorToast'));
      }
    });
  }

  return isSent ? (
    <Button variant="outline" disabled className="w-full">
      {t('sent')}
    </Button>
  ) : (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          {t('title')}
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
