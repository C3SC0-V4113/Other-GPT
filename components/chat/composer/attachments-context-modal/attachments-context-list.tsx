'use client';

import { AttachmentsContextItem } from '@/components/chat/composer/attachments-context-modal/attachments-context-item';
import { useAttachmentsContextModalState } from '@/components/chat/composer/attachments-context-modal/attachments-context-modal-context';
import { AttachmentsContextRowProvider } from '@/components/chat/composer/attachments-context-modal/attachments-context-row-context';

export function AttachmentsContextList() {
  const { attachments } = useAttachmentsContextModalState();

  return (
    <div className="flex min-w-0 flex-col">
      {attachments.map((attachment, index) => (
        <AttachmentsContextRowProvider
          key={attachment.id}
          attachment={attachment}
          restoreIndex={index}
        >
          <AttachmentsContextItem />
        </AttachmentsContextRowProvider>
      ))}
    </div>
  );
}
