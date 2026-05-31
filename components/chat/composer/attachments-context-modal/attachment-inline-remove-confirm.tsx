'use client';

import { Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const EASE_OUT_CLASS = '[transition-timing-function:cubic-bezier(0.215,0.61,0.355,1)]';

interface AttachmentInlineRemoveConfirmProps {
  attachmentName: string;
  isDisabled: boolean;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onRequestConfirm: () => void;
}

export function AttachmentInlineRemoveConfirm({
  attachmentName,
  isDisabled,
  isOpen,
  onCancel,
  onConfirm,
  onRequestConfirm,
}: AttachmentInlineRemoveConfirmProps) {
  const t = useTranslations('attachmentsModal');

  return (
    <div className="relative h-8 w-16 shrink-0 max-[380px]:w-14 sm:w-28">
      <div
        aria-hidden={isOpen}
        className={cn(
          'absolute inset-0 flex items-center justify-end transition-[opacity,transform] duration-180 will-change-transform motion-reduce:transition-none',
          EASE_OUT_CLASS,
          isOpen
            ? 'pointer-events-none translate-x-1 scale-90 opacity-0'
            : 'translate-x-0 scale-100 opacity-100'
        )}
      >
        <Button
          aria-label={t('removeAriaLabel', { name: attachmentName })}
          disabled={isDisabled || isOpen}
          onClick={onRequestConfirm}
          size="icon-xs"
          tabIndex={isOpen ? -1 : 0}
          type="button"
          variant="ghost"
        >
          <Trash2 />
        </Button>
      </div>

      <div
        aria-hidden={!isOpen}
        className={cn(
          'absolute inset-0 flex items-center justify-end gap-1 transition-[opacity,transform] duration-180 will-change-transform motion-reduce:transition-none',
          EASE_OUT_CLASS,
          isOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-2 opacity-0'
        )}
      >
        <Button
          aria-label={t('cancelRemoveAriaLabel', { name: attachmentName })}
          className="sm:hidden"
          disabled={isDisabled || !isOpen}
          onClick={onCancel}
          size="icon-xs"
          tabIndex={isOpen ? 0 : -1}
          type="button"
          variant="ghost"
        >
          <X />
        </Button>
        <Button
          className="hidden sm:inline-flex"
          disabled={isDisabled || !isOpen}
          onClick={onCancel}
          size="xs"
          tabIndex={isOpen ? 0 : -1}
          type="button"
          variant="ghost"
        >
          {t('cancel')}
        </Button>
        <Button
          aria-label={t('confirmRemoveAriaLabel', { name: attachmentName })}
          disabled={isDisabled || !isOpen}
          onClick={onConfirm}
          size="icon-xs"
          tabIndex={isOpen ? 0 : -1}
          type="button"
          variant="destructive"
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}
