'use client';

import {
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  Paperclip,
  Presentation,
  X,
} from 'lucide-react';
import Image from 'next/image';
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useDropzone, type Accept, type FileRejection } from 'react-dropzone';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatAttachmentSize, MAX_ATTACHMENT_SIZE_BYTES } from '@/lib/chat-attachments';
import { cn } from '@/lib/utils';

import type { ChatAttachment } from '@/lib/chat-attachments';

interface ComposerAttachmentsUploaderProps {
  attachments: ChatAttachment[];
  children: (controls: {
    contextAttachmentCount: number;
    openContextModal: () => void;
    openFileDialog: () => void;
  }) => ReactNode;
  errorMessage: string;
  isSubmitting: boolean;
  onAddFiles: (files: File[]) => Promise<number>;
  onRemoveAttachment: (attachmentId: string) => Promise<boolean>;
}

type DropOverlayState = 'dragActive' | 'dragReject' | 'idle' | 'processing';
type OptimisticAttachmentsAction =
  | { type: 'remove'; payload: { attachmentId: string } }
  | { type: 'restore'; payload: { attachment: ChatAttachment } };

const BADGE_EXIT_DURATION_MS = 200;
const BADGE_EXIT_EASE_CLASS = '[transition-timing-function:cubic-bezier(0.215,0.61,0.355,1)]';

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

function getToastErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
}

function reduceOptimisticAttachments(
  attachments: ChatAttachment[],
  action: OptimisticAttachmentsAction
): ChatAttachment[] {
  switch (action.type) {
    case 'remove':
      return attachments.filter((attachment) => attachment.id !== action.payload.attachmentId);
    case 'restore': {
      const { attachment } = action.payload;

      if (attachments.some((candidate) => candidate.id === attachment.id)) {
        return attachments;
      }

      return [...attachments, attachment];
    }
    default:
      return attachments;
  }
}

interface AttachmentsBadgeListProps {
  attachments: ChatAttachment[];
  className?: string;
  isSubmitting: boolean;
  onRemoveAttachment: (attachmentId: string) => Promise<boolean>;
}

function AttachmentsBadgeList({
  attachments,
  className,
  isSubmitting,
  onRemoveAttachment,
}: AttachmentsBadgeListProps) {
  const [exitingAttachmentIds, setExitingAttachmentIds] = useState<Set<string>>(() => new Set());
  const [removingAttachmentIds, setRemovingAttachmentIds] = useState<Set<string>>(() => new Set());
  const [optimisticAttachments, applyOptimisticAttachmentUpdate] = useOptimistic(
    attachments,
    reduceOptimisticAttachments
  );
  const exitTimeoutsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const exitTimeouts = exitTimeoutsRef.current;

    return () => {
      for (const timeoutId of exitTimeouts.values()) {
        window.clearTimeout(timeoutId);
      }
      exitTimeouts.clear();
    };
  }, []);

  const handleRemoveAttachment = useCallback(
    (attachment: ChatAttachment) => {
      if (isSubmitting || removingAttachmentIds.has(attachment.id)) {
        return;
      }

      setExitingAttachmentIds((currentIds) => new Set(currentIds).add(attachment.id));
      setRemovingAttachmentIds((currentIds) => new Set(currentIds).add(attachment.id));

      const timeoutId = window.setTimeout(() => {
        exitTimeoutsRef.current.delete(attachment.id);

        void (async () => {
          startTransition(() => {
            applyOptimisticAttachmentUpdate({
              payload: { attachmentId: attachment.id },
              type: 'remove',
            });
          });

          try {
            const didRemoveAttachment = await onRemoveAttachment(attachment.id);

            if (!didRemoveAttachment) {
              startTransition(() => {
                applyOptimisticAttachmentUpdate({
                  payload: { attachment },
                  type: 'restore',
                });
              });
              toast.error('No fue posible eliminar el adjunto. Intenta nuevamente.');
            }
          } finally {
            setExitingAttachmentIds((currentIds) => {
              const nextIds = new Set(currentIds);
              nextIds.delete(attachment.id);
              return nextIds;
            });
            setRemovingAttachmentIds((currentIds) => {
              const nextIds = new Set(currentIds);
              nextIds.delete(attachment.id);
              return nextIds;
            });
          }
        })();
      }, BADGE_EXIT_DURATION_MS);

      exitTimeoutsRef.current.set(attachment.id, timeoutId);
    },
    [applyOptimisticAttachmentUpdate, isSubmitting, onRemoveAttachment, removingAttachmentIds]
  );

  if (!optimisticAttachments.length) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {optimisticAttachments.map((attachment) => {
        const isExiting = exitingAttachmentIds.has(attachment.id);
        const isRemoving = removingAttachmentIds.has(attachment.id);

        return (
          <div
            key={attachment.id}
            className={cn(
              'origin-left overflow-hidden transition-[max-height,max-width,opacity,transform] duration-200 motion-reduce:transition-none',
              BADGE_EXIT_EASE_CLASS,
              isExiting
                ? 'max-h-0 max-w-0 -translate-y-0.5 scale-95 opacity-0'
                : 'max-h-16 max-w-[22rem] translate-y-0 scale-100 opacity-100'
            )}
          >
            <Badge
              className="h-auto max-w-[22rem] gap-1.5 rounded-lg border-border/70 bg-muted/50 px-2 py-1 text-foreground"
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
                disabled={isSubmitting || isRemoving}
                onClick={() => {
                  handleRemoveAttachment(attachment);
                }}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <X />
              </Button>
            </Badge>
          </div>
        );
      })}
    </div>
  );
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
  const [dropOverlayState, setDropOverlayState] = useState<DropOverlayState>('idle');
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);

  const clearDropFeedback = useCallback(() => {
    setDropErrorMessage('');
    setDropOverlayState((currentState) => (currentState === 'processing' ? currentState : 'idle'));
  }, []);

  const handleDrop = useCallback(
    async (acceptedFiles: File[]) => {
      clearDropFeedback();

      if (!acceptedFiles.length || isSubmitting) {
        setDropOverlayState('idle');
        return;
      }

      setDropOverlayState('processing');

      try {
        const attachedCount = await onAddFiles(acceptedFiles);

        if (attachedCount > 0) {
          toast.success(
            attachedCount === 1
              ? '1 archivo agregado al contexto.'
              : `${attachedCount} archivos agregados al contexto.`
          );
        }
      } catch (error) {
        toast.error(getToastErrorMessage(error, 'No fue posible subir archivos al contexto.'));
      } finally {
        setDropOverlayState('idle');
      }
    },
    [clearDropFeedback, isSubmitting, onAddFiles]
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
        ['image/gif', ['.gif']],
        ['image/jpeg', ['.jpeg', '.jpg']],
        ['image/png', ['.png']],
        ['image/webp', ['.webp']],
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
    onDragEnter: () => {
      if (isSubmitting) {
        return;
      }

      setDropOverlayState('dragActive');
    },
    onDragLeave: () => {
      setDropOverlayState((currentState) =>
        currentState === 'processing' ? currentState : 'idle'
      );
    },
    onDrop: (acceptedFiles: File[], rejections: FileRejection[]) => {
      if (rejections.length) {
        setDropErrorMessage('Archivo rechazado: formato o tamano no permitido.');
        setDropOverlayState('dragReject');
      }

      if (!rejections.length && !acceptedFiles.length) {
        setDropOverlayState('idle');
      }

      if (acceptedFiles.length) {
        void handleDrop(acceptedFiles);
      }
    },
  });

  const openFileDialog = useCallback(() => {
    clearDropFeedback();
    open();
  }, [clearDropFeedback, open]);
  const openContextModal = useCallback(() => {
    setIsContextModalOpen(true);
  }, []);

  const resolvedDropOverlayState: DropOverlayState =
    dropOverlayState === 'processing'
      ? 'processing'
      : isDragReject
        ? 'dragReject'
        : isDragActive
          ? 'dragActive'
          : dropOverlayState;

  const shouldShowOverlay = resolvedDropOverlayState !== 'idle';
  const liveErrorMessage = dropErrorMessage || errorMessage;

  const overlayMessage = useMemo(() => {
    if (resolvedDropOverlayState === 'processing') {
      return 'Procesando adjuntos...';
    }

    if (resolvedDropOverlayState === 'dragReject') {
      return 'Formato o tamano no valido.';
    }

    return 'Suelta para adjuntar.';
  }, [resolvedDropOverlayState]);

  return (
    <div
      {...getRootProps({
        className: 'relative',
        onFocusCapture: clearDropFeedback,
        onKeyDownCapture: clearDropFeedback,
        onPointerDownCapture: clearDropFeedback,
      })}
    >
      <input {...getInputProps()} />

      {children({
        contextAttachmentCount: attachments.length,
        openContextModal,
        openFileDialog,
      })}

      {shouldShowOverlay ? (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-xl border-2 border-dashed bg-muted/40 text-sm transition duration-150',
            resolvedDropOverlayState === 'dragReject'
              ? 'border-destructive text-destructive'
              : 'border-primary text-foreground'
          )}
        >
          <span>{overlayMessage}</span>
        </div>
      ) : null}

      <Dialog onOpenChange={setIsContextModalOpen} open={isContextModalOpen}>
        <DialogContent className="w-[min(92vw,46rem)]">
          <DialogHeader>
            <DialogTitle>Archivos en contexto</DialogTitle>
            <DialogDescription>
              Estos archivos permanecen activos para los siguientes prompts hasta que los elimines.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary">{attachments.length} activos</Badge>
            <Button
              disabled={isSubmitting}
              onClick={openFileDialog}
              size="sm"
              type="button"
              variant="outline"
            >
              <Paperclip data-icon="inline-start" />
              Agregar archivos
            </Button>
          </div>

          {attachments.length ? (
            <ScrollArea className="max-h-60 rounded-2xl border bg-muted/20 p-3">
              <AttachmentsBadgeList
                attachments={attachments}
                isSubmitting={isSubmitting}
                onRemoveAttachment={onRemoveAttachment}
              />
            </ScrollArea>
          ) : (
            <Empty className="rounded-2xl border-border/80 p-6">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileArchive />
                </EmptyMedia>
                <EmptyTitle>Sin archivos en contexto</EmptyTitle>
                <EmptyDescription>
                  Agrega adjuntos para que el modelo pueda usarlos en tus siguientes mensajes.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button disabled={isSubmitting} onClick={openFileDialog} type="button">
                  <Paperclip data-icon="inline-start" />
                  Adjuntar archivos
                </Button>
              </EmptyContent>
            </Empty>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cerrar
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {liveErrorMessage ? (
        <p aria-live="polite" className="mt-1 text-xs text-destructive">
          {liveErrorMessage}
        </p>
      ) : null}
    </div>
  );
}
