'use client';

import { AttachmentsContextItem } from '@/components/chat/composer/attachments-context-modal/attachments-context-item';

import type { ChatAttachment } from '@/lib/chat-attachments';

interface AttachmentsContextListProps {
  attachments: ChatAttachment[];
  confirmingAttachmentId: string | null;
  exitingAttachmentIds: Set<string>;
  isSubmitting: boolean;
  onCancelRemove: (attachmentId: string) => void;
  onConfirmRemove: (attachment: ChatAttachment, restoreIndex: number) => void;
  onRequestRemove: (attachmentId: string) => void;
  onToggleContext: (attachment: ChatAttachment, isIncludedInContext: boolean) => void;
  removingAttachmentIds: Set<string>;
  updatingAttachmentIds: Set<string>;
}

export function AttachmentsContextList({
  attachments,
  confirmingAttachmentId,
  exitingAttachmentIds,
  isSubmitting,
  onCancelRemove,
  onConfirmRemove,
  onRequestRemove,
  onToggleContext,
  removingAttachmentIds,
  updatingAttachmentIds,
}: AttachmentsContextListProps) {
  return (
    <div className="flex min-w-0 flex-col">
      {attachments.map((attachment, index) => (
        <AttachmentsContextItem
          key={attachment.id}
          attachment={attachment}
          onCancelRemove={() => {
            onCancelRemove(attachment.id);
          }}
          onConfirmRemove={() => {
            onConfirmRemove(attachment, index);
          }}
          onRequestRemove={() => {
            onRequestRemove(attachment.id);
          }}
          onToggleContext={(isIncludedInContext) => {
            onToggleContext(attachment, isIncludedInContext);
          }}
          state={{
            isConfirmingRemove: confirmingAttachmentId === attachment.id,
            isDisabled: isSubmitting,
            isExiting: exitingAttachmentIds.has(attachment.id),
            isRemoving: removingAttachmentIds.has(attachment.id),
            isUpdatingContext: updatingAttachmentIds.has(attachment.id),
          }}
        />
      ))}
    </div>
  );
}
