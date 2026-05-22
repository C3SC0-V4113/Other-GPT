'use client';

import {
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  Presentation,
} from 'lucide-react';
import Image from 'next/image';

import { AttachmentContextCheckbox } from '@/components/chat/composer/attachments-context-modal/attachment-context-checkbox';
import { AttachmentInlineRemoveConfirm } from '@/components/chat/composer/attachments-context-modal/attachment-inline-remove-confirm';
import { formatAttachmentSize } from '@/lib/chat-attachments';
import { cn } from '@/lib/utils';

import type { AttachmentContextRowState } from '@/components/chat/composer/attachments-context-modal/types';
import type { ChatAttachment } from '@/lib/chat-attachments';

const EASE_OUT_CLASS = '[transition-timing-function:cubic-bezier(0.215,0.61,0.355,1)]';

function AttachmentFileIcon({ attachment }: { attachment: ChatAttachment }) {
  if (attachment.kind === 'image') {
    return <FileImage className="size-5 text-muted-foreground" />;
  }

  if (attachment.kind === 'pdf') {
    return <FileType2 className="size-5 text-muted-foreground" />;
  }

  if (attachment.kind === 'spreadsheet') {
    return <FileSpreadsheet className="size-5 text-muted-foreground" />;
  }

  if (attachment.kind === 'presentation') {
    return <Presentation className="size-5 text-muted-foreground" />;
  }

  if (attachment.kind === 'markdown' || attachment.kind === 'document') {
    return <FileText className="size-5 text-muted-foreground" />;
  }

  return <FileArchive className="size-5 text-muted-foreground" />;
}

interface AttachmentsContextItemProps {
  attachment: ChatAttachment;
  onCancelRemove: () => void;
  onConfirmRemove: () => void;
  onRequestRemove: () => void;
  onToggleContext: (isIncludedInContext: boolean) => void;
  state: AttachmentContextRowState;
}

export function AttachmentsContextItem({
  attachment,
  onCancelRemove,
  onConfirmRemove,
  onRequestRemove,
  onToggleContext,
  state,
}: AttachmentsContextItemProps) {
  const isRowDisabled = state.isDisabled || state.isRemoving || state.isUpdatingContext;

  return (
    <div
      className={cn(
        'origin-top overflow-hidden transition-[max-height,margin,opacity,transform] duration-200 motion-reduce:transition-none',
        EASE_OUT_CLASS,
        state.isExiting
          ? 'my-0 max-h-0 -translate-y-0.5 scale-[0.99] opacity-0'
          : 'my-2 max-h-24 translate-y-0 scale-100 opacity-100'
      )}
    >
      <div
        className={cn(
          'grid min-w-0 grid-cols-[auto_minmax(0,1fr)_7rem] items-center gap-2 rounded-xl border px-2 py-2 sm:gap-3 sm:px-3',
          'transition-[background-color,border-color,opacity] duration-150 motion-reduce:transition-none',
          EASE_OUT_CLASS,
          attachment.isIncludedInContext
            ? 'border-border/70 bg-background/60'
            : 'border-border/60 bg-muted/25'
        )}
      >
        <AttachmentContextCheckbox
          attachmentName={attachment.name}
          isChecked={attachment.isIncludedInContext}
          isDisabled={isRowDisabled}
          onCheckedChange={onToggleContext}
        />

        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/40">
            {attachment.kind === 'image' && attachment.previewUrl ? (
              <Image
                alt={attachment.name}
                className="size-9 rounded-lg object-cover"
                height={36}
                src={attachment.previewUrl}
                unoptimized
                width={36}
              />
            ) : (
              <AttachmentFileIcon attachment={attachment} />
            )}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground" title={attachment.name}>
              {attachment.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatAttachmentSize(attachment.sizeBytes)}
            </p>
          </div>
        </div>

        <AttachmentInlineRemoveConfirm
          attachmentName={attachment.name}
          isDisabled={isRowDisabled}
          isOpen={state.isConfirmingRemove}
          onCancel={onCancelRemove}
          onConfirm={onConfirmRemove}
          onRequestConfirm={onRequestRemove}
        />
      </div>
    </div>
  );
}
