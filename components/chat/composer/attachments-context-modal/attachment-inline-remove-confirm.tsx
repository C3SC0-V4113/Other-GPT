'use client';

import { Trash2 } from 'lucide-react';

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
  return (
    <div className="relative h-8 w-28 shrink-0">
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
          aria-label={`Quitar ${attachmentName}`}
          disabled={isDisabled}
          onClick={onRequestConfirm}
          size="icon-xs"
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
          disabled={isDisabled || !isOpen}
          onClick={onCancel}
          size="xs"
          type="button"
          variant="ghost"
        >
          Cancelar
        </Button>
        <Button
          aria-label={`Confirmar eliminacion de ${attachmentName}`}
          disabled={isDisabled || !isOpen}
          onClick={onConfirm}
          size="icon-xs"
          type="button"
          variant="destructive"
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}
