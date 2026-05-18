'use client';

import {
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  Presentation,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useDropzone, type Accept, type FileRejection } from 'react-dropzone';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatAttachmentSize, MAX_ATTACHMENT_SIZE_BYTES } from '@/lib/chat-attachments';
import { cn } from '@/lib/utils';

import type { ChatAttachment } from '@/lib/chat-attachments';

interface ComposerAttachmentsUploaderProps {
  attachments: ChatAttachment[];
  children: (controls: { openFileDialog: () => void }) => ReactNode;
  errorMessage: string;
  isSubmitting: boolean;
  onAddFiles: (files: File[]) => Promise<void>;
  onRemoveAttachment: (attachmentId: string) => Promise<void>;
}

function getAttachmentIcon(attachment: ChatAttachment) {
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

  if (attachment.kind === 'markdown') {
    return <FileText />;
  }

  if (attachment.kind === 'document') {
    return <FileText />;
  }

  return <FileArchive />;
}

export function ComposerAttachmentsUploader({
  attachments,
  children,
  errorMessage,
  isSubmitting,
  onAddFiles,
  onRemoveAttachment,
}: ComposerAttachmentsUploaderProps) {
  const [dropErrorMessage, setDropErrorMessage] = useState('');
  const [isProcessingDrop, setIsProcessingDrop] = useState(false);

  const handleDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setDropErrorMessage('');

      if (!acceptedFiles.length || isSubmitting) {
        return;
      }

      setIsProcessingDrop(true);

      try {
        await onAddFiles(acceptedFiles);
      } finally {
        setIsProcessingDrop(false);
      }
    },
    [isSubmitting, onAddFiles]
  );

  const acceptedMimeTypes: Accept = useMemo(
    () =>
      Object.fromEntries([
        ['application/msword', ['.doc']],
        ['application/pdf', ['.pdf']],
        ['application/rtf', ['.rtf']],
        ['application/vnd.ms-excel', ['.xls']],
        ['application/vnd.ms-powerpoint', ['.ppt']],
        ['application/vnd.oasis.opendocument.presentation', ['.odp']],
        ['application/vnd.oasis.opendocument.spreadsheet', ['.ods']],
        ['application/vnd.oasis.opendocument.text', ['.odt']],
        ['application/vnd.openxmlformats-officedocument.presentationml.presentation', ['.pptx']],
        ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ['.xlsx']],
        ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', ['.docx']],
        ['image/*', ['.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']],
        ['text/csv', ['.csv']],
        ['text/markdown', ['.markdown', '.md']],
        ['text/plain', ['.txt']],
      ]) as Accept,
    []
  );

  const { getInputProps, getRootProps, isDragActive, isDragReject, open } = useDropzone({
    accept: acceptedMimeTypes,
    disabled: isSubmitting,
    maxSize: MAX_ATTACHMENT_SIZE_BYTES,
    noClick: true,
    noKeyboard: true,
    onDrop: (acceptedFiles: File[], rejections: FileRejection[]) => {
      if (rejections.length) {
        setDropErrorMessage('Archivo rechazado: formato o tamano no permitido.');
      }

      void handleDrop(acceptedFiles);
    },
  });

  const shouldShowOverlay = isDragActive || isDragReject || isProcessingDrop;
  const liveErrorMessage = dropErrorMessage || errorMessage;

  const overlayMessage = useMemo(() => {
    if (isProcessingDrop) {
      return 'Procesando adjuntos...';
    }

    if (isDragReject) {
      return 'Formato o tamano no valido.';
    }

    return 'Suelta para adjuntar.';
  }, [isDragReject, isProcessingDrop]);

  return (
    <div {...getRootProps({ className: 'relative' })}>
      <input {...getInputProps()} />

      {children({ openFileDialog: open })}

      {shouldShowOverlay ? (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-xl border-2 border-dashed bg-muted/40 text-sm transition duration-150',
            isDragReject ? 'border-destructive text-destructive' : 'border-primary text-foreground'
          )}
        >
          <span>{overlayMessage}</span>
        </div>
      ) : null}

      {attachments.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {attachments.map((attachment) => (
            <Badge
              key={attachment.id}
              className="h-auto max-w-55 gap-1.5 rounded-lg border-border/70 bg-muted/50 px-2 py-1 text-foreground"
              variant="outline"
            >
              {attachment.kind === 'image' && attachment.previewUrl ? (
                <Image
                  alt={attachment.name}
                  className="size-4 rounded object-cover"
                  height={16}
                  src={attachment.previewUrl}
                  unoptimized
                  width={16}
                />
              ) : (
                getAttachmentIcon(attachment)
              )}

              <span className="max-w-28 truncate">{attachment.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {formatAttachmentSize(attachment.sizeBytes)}
              </span>

              <Button
                aria-label={`Quitar ${attachment.name}`}
                disabled={isSubmitting}
                onClick={() => {
                  void onRemoveAttachment(attachment.id);
                }}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <X />
              </Button>
            </Badge>
          ))}
        </div>
      ) : null}

      {liveErrorMessage ? (
        <p aria-live="polite" className="mt-1 text-xs text-destructive">
          {liveErrorMessage}
        </p>
      ) : null}
    </div>
  );
}
