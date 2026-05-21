import {
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  Presentation,
} from 'lucide-react';

import * as ChatBubble from '@/components/chat/chat-bubble';
import { Badge } from '@/components/ui/badge';
import { formatAttachmentSize } from '@/lib/chat-attachments';

import type { AssistantTextMessageBubbleProps } from '@/components/chat/message-bubbles/types';
import type { ChatAttachmentSnapshot } from '@/lib/chat-attachments';

const messageStateLabels = {
  error: 'Error',
  interrupted: 'Interrumpido',
  streaming: 'Generando...',
} as const;

function getAttachmentIcon(attachment: ChatAttachmentSnapshot) {
  if (attachment.kind === 'image') {
    return <FileImage />;
  }

  if (attachment.kind === 'pdf') {
    return <FileType2 />;
  }

  if (attachment.kind === 'spreadsheet') {
    return <FileSpreadsheet />;
  }

  if (attachment.kind === 'presentation') {
    return <Presentation />;
  }

  if (attachment.kind === 'markdown' || attachment.kind === 'document') {
    return <FileText />;
  }

  return <FileArchive />;
}

export function AttachmentBadges({ attachments }: { attachments: ChatAttachmentSnapshot[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {attachments.map((attachment) => (
        <Badge
          key={attachment.id}
          className="h-auto max-w-55 gap-1.5 rounded-lg border-primary-foreground/30 bg-primary-foreground/10 px-2 py-1 text-primary-foreground"
          variant="outline"
        >
          {getAttachmentIcon(attachment)}
          <span className="max-w-28 truncate">{attachment.name}</span>
          <span className="text-[10px] opacity-80">
            {formatAttachmentSize(attachment.sizeBytes)}
          </span>
        </Badge>
      ))}
    </div>
  );
}

export function AssistantStatusFooter({
  retryLastFailedPrompt,
  retryPrompt,
  status,
}: Pick<AssistantTextMessageBubbleProps, 'retryLastFailedPrompt' | 'retryPrompt' | 'status'>) {
  if (status === 'complete') {
    return null;
  }

  return (
    <ChatBubble.Footer>
      <span>{messageStateLabels[status]}</span>

      {status === 'interrupted' || (status === 'error' && retryPrompt) ? (
        <ChatBubble.Actions>
          <ChatBubble.Action
            onClick={() => {
              void retryLastFailedPrompt();
            }}
            variant={status === 'error' ? 'destructive' : 'ghost'}
          >
            Reintentar
          </ChatBubble.Action>
        </ChatBubble.Actions>
      ) : null}
    </ChatBubble.Footer>
  );
}
