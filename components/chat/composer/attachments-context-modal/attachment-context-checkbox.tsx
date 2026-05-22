'use client';

import { useAttachmentsContextRow } from '@/components/chat/composer/attachments-context-modal/attachments-context-row-context';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export function AttachmentContextCheckbox() {
  const { attachment, isDisabled, onToggleContext } = useAttachmentsContextRow();

  return (
    <div className="flex size-8 shrink-0 items-center justify-center sm:size-9">
      <Checkbox
        aria-label={
          attachment.isIncludedInContext
            ? `Excluir ${attachment.name} del contexto`
            : `Incluir ${attachment.name} en el contexto`
        }
        checked={attachment.isIncludedInContext}
        className={cn(
          'transition-[transform,opacity] duration-150 motion-reduce:transition-none',
          isDisabled ? 'opacity-60' : 'opacity-100'
        )}
        disabled={isDisabled}
        onCheckedChange={(checked) => {
          onToggleContext(checked === true);
        }}
      />
    </div>
  );
}
