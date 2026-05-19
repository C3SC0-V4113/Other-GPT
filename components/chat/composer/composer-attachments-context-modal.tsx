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
import { startTransition, useCallback, useEffect, useOptimistic, useRef, useState } from 'react';
import { type DropzoneInputProps, type DropzoneRootProps } from 'react-dropzone';
import { toast } from 'sonner';

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
import { formatAttachmentSize } from '@/lib/chat-attachments';
import { cn } from '@/lib/utils';

import type { ChatAttachment } from '@/lib/chat-attachments';

export type AttachmentsDropOverlayState = 'dragActive' | 'dragReject' | 'idle' | 'processing';

type OptimisticAttachmentsAction =
  | { type: 'remove'; payload: { attachmentId: string } }
  | { type: 'restore'; payload: { attachment: ChatAttachment; restoreIndex: number } };

const ITEM_EXIT_DURATION_MS = 200;
const ITEM_EXIT_EASE_CLASS = '[transition-timing-function:cubic-bezier(0.215,0.61,0.355,1)]';

interface ComposerAttachmentsContextModalProps {
  attachments: ChatAttachment[];
  dropErrorMessage: string;
  dropOverlayMessage: string;
  dropOverlayState: AttachmentsDropOverlayState;
  getDropzoneInputProps: <T extends DropzoneInputProps>(props?: T) => T;
  getDropzoneRootProps: <T extends DropzoneRootProps>(props?: T) => T;
  isOpen: boolean;
  isSubmitting: boolean;
  onAddFiles: () => void;
  onOpenChange: (isOpen: boolean) => void;
  onRemoveAttachment: (attachmentId: string) => Promise<boolean>;
}

function getAttachmentIcon(attachment: ChatAttachment) {
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

function reduceOptimisticAttachments(
  attachments: ChatAttachment[],
  action: OptimisticAttachmentsAction
): ChatAttachment[] {
  switch (action.type) {
    case 'remove':
      return attachments.filter((attachment) => attachment.id !== action.payload.attachmentId);
    case 'restore': {
      const { attachment, restoreIndex } = action.payload;

      if (attachments.some((candidate) => candidate.id === attachment.id)) {
        return attachments;
      }

      const nextAttachments = [...attachments];
      const clampedIndex = Math.max(0, Math.min(restoreIndex, nextAttachments.length));
      nextAttachments.splice(clampedIndex, 0, attachment);
      return nextAttachments;
    }
    default:
      return attachments;
  }
}

function AttachmentsList({
  attachments,
  isSubmitting,
  onRemoveAttachment,
}: {
  attachments: ChatAttachment[];
  isSubmitting: boolean;
  onRemoveAttachment: (attachmentId: string) => Promise<boolean>;
}) {
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
    (attachment: ChatAttachment, restoreIndex: number) => {
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
                  payload: { attachment, restoreIndex },
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
      }, ITEM_EXIT_DURATION_MS);

      exitTimeoutsRef.current.set(attachment.id, timeoutId);
    },
    [applyOptimisticAttachmentUpdate, isSubmitting, onRemoveAttachment, removingAttachmentIds]
  );

  if (!optimisticAttachments.length) {
    return null;
  }

  return (
    <div className="space-y-2">
      {optimisticAttachments.map((attachment, index) => {
        const isExiting = exitingAttachmentIds.has(attachment.id);
        const isRemoving = removingAttachmentIds.has(attachment.id);

        return (
          <div
            key={attachment.id}
            className={cn(
              'origin-top overflow-hidden transition-[max-height,margin,opacity,transform] duration-200 motion-reduce:transition-none',
              ITEM_EXIT_EASE_CLASS,
              isExiting
                ? 'my-0 max-h-0 -translate-y-0.5 scale-[0.99] opacity-0'
                : 'my-2 max-h-24 translate-y-0 scale-100 opacity-100'
            )}
          >
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/60 px-3 py-2">
              <div className="shrink-0">
                {attachment.kind === 'image' && attachment.previewUrl ? (
                  <Image
                    alt={attachment.name}
                    className="size-10 rounded-md object-cover"
                    height={40}
                    src={attachment.previewUrl}
                    unoptimized
                    width={40}
                  />
                ) : (
                  getAttachmentIcon(attachment)
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{attachment.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatAttachmentSize(attachment.sizeBytes)}
                </p>
              </div>

              <Button
                aria-label={`Quitar ${attachment.name}`}
                disabled={isSubmitting || isRemoving}
                onClick={() => {
                  handleRemoveAttachment(attachment, index);
                }}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <X />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ComposerAttachmentsContextModal({
  attachments,
  dropErrorMessage,
  dropOverlayMessage,
  dropOverlayState,
  getDropzoneInputProps,
  getDropzoneRootProps,
  isOpen,
  isSubmitting,
  onAddFiles,
  onOpenChange,
  onRemoveAttachment,
}: ComposerAttachmentsContextModalProps) {
  const isDropOverlayVisible = dropOverlayState !== 'idle';

  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogContent className="w-[min(92vw,46rem)]">
        <DialogHeader>
          <DialogTitle>Archivos en contexto</DialogTitle>
          <DialogDescription>
            Estos archivos permanecen activos para los siguientes prompts hasta que los elimines.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{attachments.length} activos</p>
          <Button
            disabled={isSubmitting}
            onClick={onAddFiles}
            size="sm"
            type="button"
            variant="outline"
          >
            <Paperclip data-icon="inline-start" />
            Agregar archivos
          </Button>
        </div>

        <div
          {...getDropzoneRootProps({
            className:
              'relative rounded-2xl border border-border/80 bg-muted/20 p-3 outline-none focus-visible:ring-2 focus-visible:ring-primary',
          })}
        >
          <input {...getDropzoneInputProps()} />

          {attachments.length ? (
            <ScrollArea className="max-h-72 pr-1">
              <AttachmentsList
                attachments={attachments}
                isSubmitting={isSubmitting}
                onRemoveAttachment={onRemoveAttachment}
              />
            </ScrollArea>
          ) : (
            <Empty className="rounded-xl border-border/60 p-6">
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
                <Button disabled={isSubmitting} onClick={onAddFiles} type="button">
                  <Paperclip data-icon="inline-start" />
                  Adjuntar archivos
                </Button>
              </EmptyContent>
            </Empty>
          )}

          {isDropOverlayVisible ? (
            <div
              className={cn(
                'pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed bg-muted/40 text-sm transition duration-150',
                dropOverlayState === 'dragReject'
                  ? 'border-destructive text-destructive'
                  : 'border-primary text-foreground'
              )}
            >
              <span>{dropOverlayMessage}</span>
            </div>
          ) : null}
        </div>

        {dropErrorMessage ? (
          <p aria-live="polite" className="text-xs text-destructive">
            {dropErrorMessage}
          </p>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cerrar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
