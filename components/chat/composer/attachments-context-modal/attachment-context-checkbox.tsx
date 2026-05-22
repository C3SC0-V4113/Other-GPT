'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface AttachmentContextCheckboxProps {
  attachmentName: string;
  isChecked: boolean;
  isDisabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function AttachmentContextCheckbox({
  attachmentName,
  isChecked,
  isDisabled,
  onCheckedChange,
}: AttachmentContextCheckboxProps) {
  return (
    <div className="flex size-9 shrink-0 items-center justify-center">
      <Checkbox
        aria-label={
          isChecked
            ? `Excluir ${attachmentName} del contexto`
            : `Incluir ${attachmentName} en el contexto`
        }
        checked={isChecked}
        className={cn(
          'transition-[transform,opacity] duration-150 motion-reduce:transition-none',
          isDisabled ? 'opacity-60' : 'opacity-100'
        )}
        disabled={isDisabled}
        onCheckedChange={(checked) => {
          onCheckedChange(checked === true);
        }}
      />
    </div>
  );
}
