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
import { useAttachmentsContextRow } from '@/components/chat/composer/attachments-context-modal/attachments-context-row-context';
import { formatAttachmentSize } from '@/lib/chat-attachments';
import { cn } from '@/lib/utils';

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

export function AttachmentsContextItem() {
  const {
    attachment,
    isConfirmingRemove,
    isDisabled,
    isExiting,
    onCancelRemove,
    onConfirmRemove,
    onRequestRemove,
  } = useAttachmentsContextRow();

  return (
    <div
      className={cn(
        'origin-top overflow-hidden transition-[max-height,margin,opacity,transform] duration-200 motion-reduce:transition-none',
        EASE_OUT_CLASS,
        isExiting
          ? 'my-0 max-h-0 -translate-y-0.5 scale-[0.99] opacity-0'
          : 'my-2 max-h-24 translate-y-0 scale-100 opacity-100'
      )}
    >
      <div
        className={cn(
          'grid min-w-0 grid-cols-[auto_minmax(0,1fr)_4rem] items-center gap-1.5 rounded-xl border px-2 py-2 max-[380px]:grid-cols-[auto_minmax(0,1fr)_3.5rem] max-[380px]:gap-1 sm:grid-cols-[auto_minmax(0,1fr)_7rem] sm:gap-3 sm:px-3',
          'transition-[background-color,border-color,opacity] duration-150 motion-reduce:transition-none',
          EASE_OUT_CLASS,
          attachment.isIncludedInContext
            ? 'border-border/70 bg-background/60'
            : 'border-border/60 bg-muted/25'
        )}
      >
        <AttachmentContextCheckbox />

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/40 max-[380px]:size-7 sm:size-9">
            {attachment.kind === 'image' && attachment.previewUrl ? (
              <Image
                alt={attachment.name}
                className="size-full rounded-lg object-cover"
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
            <p
              className="truncate text-[13px] font-medium text-foreground sm:text-sm"
              title={attachment.name}
            >
              {attachment.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatAttachmentSize(attachment.sizeBytes)}
            </p>
          </div>
        </div>

        <AttachmentInlineRemoveConfirm
          attachmentName={attachment.name}
          isDisabled={isDisabled}
          isOpen={isConfirmingRemove}
          onCancel={onCancelRemove}
          onConfirm={onConfirmRemove}
          onRequestConfirm={onRequestRemove}
        />
      </div>
    </div>
  );
}
