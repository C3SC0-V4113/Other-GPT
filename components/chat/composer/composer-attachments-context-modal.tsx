'use client';

import {
  Check,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  Paperclip,
  Presentation,
  Trash2,
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
import {
  formatAttachmentSize,
  getIncludedChatAttachments,
  type ChatAttachment,
} from '@/lib/chat-attachments';
import { cn } from '@/lib/utils';

export type AttachmentsDropOverlayState = 'dragActive' | 'dragReject' | 'idle' | 'processing';

type OptimisticAttachmentsAction =
  | { type: 'remove'; payload: { attachmentId: string } }
  | { type: 'restore'; payload: { attachment: ChatAttachment; restoreIndex: number } }
  | {
      type: 'set-context';
      payload: { attachmentId: string; isIncludedInContext: boolean };
    };

const ITEM_EXIT_DURATION_MS = 200;
const EASE_OUT_CLASS = '[transition-timing-function:cubic-bezier(0.215,0.61,0.355,1)]';

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
  onSetAttachmentIncludedInContext: (
    attachmentId: string,
    isIncludedInContext: boolean
  ) => Promise<boolean>;
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
    case 'set-context':
      return attachments.map((attachment) =>
        attachment.id === action.payload.attachmentId
          ? { ...attachment, isIncludedInContext: action.payload.isIncludedInContext }
          : attachment
      );
    default:
      return attachments;
  }
}

function AttachmentContextCheckbox({
  attachmentId,
  isChecked,
  isDisabled,
  onCheckedChange,
}: {
  attachmentId: string;
  isChecked: boolean;
  isDisabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground transition-[background-color,color] duration-150 motion-reduce:transition-none',
        EASE_OUT_CLASS,
        isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-muted/60'
      )}
      htmlFor={`attachment-context-${attachmentId}`}
    >
      <input
        checked={isChecked}
        className="peer sr-only"
        disabled={isDisabled}
        id={`attachment-context-${attachmentId}`}
        onChange={(event) => {
          onCheckedChange(event.target.checked);
        }}
        type="checkbox"
      />
      <span
        className={cn(
          'flex size-4 items-center justify-center rounded-[0.35rem] border transition-[background-color,border-color,opacity,transform] duration-150 motion-reduce:transition-none',
          EASE_OUT_CLASS,
          isChecked
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-background text-transparent'
        )}
      >
        <Check
          className={cn(
            'size-3 transition-[opacity,transform] duration-150 motion-reduce:transition-none',
            EASE_OUT_CLASS,
            isChecked ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
          )}
        />
      </span>
      <span>En contexto</span>
    </label>
  );
}

function AttachmentInlineRemoveConfirm({
  isDisabled,
  isOpen,
  onCancel,
  onConfirm,
}: {
  isDisabled: boolean;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      aria-hidden={!isOpen}
      className={cn(
        'flex items-center overflow-hidden transition-[max-width,margin,opacity,transform] duration-180 motion-reduce:transition-none',
        EASE_OUT_CLASS,
        isOpen
          ? 'ml-2 max-w-48 translate-x-0 opacity-100'
          : 'pointer-events-none ml-0 max-w-0 translate-x-2 opacity-0'
      )}
    >
      <div className="flex items-center gap-1">
        <Button
          disabled={isDisabled || !isOpen}
          onClick={onCancel}
          size="xs"
          type="button"
          variant="ghost"
        >
          Cancelar
        </Button>
        <Button
          disabled={isDisabled || !isOpen}
          onClick={onConfirm}
          size="xs"
          type="button"
          variant="destructive"
        >
          Eliminar
        </Button>
      </div>
    </div>
  );
}

function useOptimisticAttachmentsState({
  attachments,
  isSubmitting,
  onRemoveAttachment,
  onSetAttachmentIncludedInContext,
}: {
  attachments: ChatAttachment[];
  isSubmitting: boolean;
  onRemoveAttachment: (attachmentId: string) => Promise<boolean>;
  onSetAttachmentIncludedInContext: (
    attachmentId: string,
    isIncludedInContext: boolean
  ) => Promise<boolean>;
}) {
  const [confirmingAttachmentId, setConfirmingAttachmentId] = useState<string | null>(null);
  const [exitingAttachmentIds, setExitingAttachmentIds] = useState<Set<string>>(() => new Set());
  const [removingAttachmentIds, setRemovingAttachmentIds] = useState<Set<string>>(() => new Set());
  const [updatingAttachmentIds, setUpdatingAttachmentIds] = useState<Set<string>>(() => new Set());
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

  const toggleContext = useCallback(
    async (attachment: ChatAttachment, isIncludedInContext: boolean) => {
      if (
        isSubmitting ||
        updatingAttachmentIds.has(attachment.id) ||
        removingAttachmentIds.has(attachment.id)
      ) {
        return;
      }

      setUpdatingAttachmentIds((currentIds) => new Set(currentIds).add(attachment.id));
      setConfirmingAttachmentId((currentId) => (currentId === attachment.id ? null : currentId));

      startTransition(() => {
        applyOptimisticAttachmentUpdate({
          payload: { attachmentId: attachment.id, isIncludedInContext },
          type: 'set-context',
        });
      });

      try {
        const didUpdateAttachment = await onSetAttachmentIncludedInContext(
          attachment.id,
          isIncludedInContext
        );

        if (!didUpdateAttachment) {
          startTransition(() => {
            applyOptimisticAttachmentUpdate({
              payload: {
                attachmentId: attachment.id,
                isIncludedInContext: attachment.isIncludedInContext,
              },
              type: 'set-context',
            });
          });
          toast.error('No fue posible actualizar el contexto del adjunto. Intenta nuevamente.');
        }
      } finally {
        setUpdatingAttachmentIds((currentIds) => {
          const nextIds = new Set(currentIds);
          nextIds.delete(attachment.id);
          return nextIds;
        });
      }
    },
    [
      applyOptimisticAttachmentUpdate,
      isSubmitting,
      onSetAttachmentIncludedInContext,
      removingAttachmentIds,
      updatingAttachmentIds,
    ]
  );

  const removeAttachment = useCallback(
    (attachment: ChatAttachment, restoreIndex: number) => {
      if (
        isSubmitting ||
        removingAttachmentIds.has(attachment.id) ||
        updatingAttachmentIds.has(attachment.id)
      ) {
        return;
      }

      setConfirmingAttachmentId(null);
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
    [
      applyOptimisticAttachmentUpdate,
      isSubmitting,
      onRemoveAttachment,
      removingAttachmentIds,
      updatingAttachmentIds,
    ]
  );

  return {
    confirmingAttachmentId,
    exitingAttachmentIds,
    optimisticAttachments,
    removingAttachmentIds,
    setConfirmingAttachmentId,
    toggleContext,
    removeAttachment,
    updatingAttachmentIds,
  };
}

function AttachmentContextItem({
  attachment,
  state,
  onArmRemove,
  onCancelRemove,
  onConfirmRemove,
  onToggleContext,
}: {
  attachment: ChatAttachment;
  state: {
    isConfirmingRemoval: boolean;
    isDisabled: boolean;
    isExiting: boolean;
    isRemoving: boolean;
    isUpdatingContext: boolean;
  };
  onArmRemove: () => void;
  onCancelRemove: () => void;
  onConfirmRemove: () => void;
  onToggleContext: (isIncludedInContext: boolean) => void;
}) {
  const isRowDisabled = state.isDisabled || state.isRemoving || state.isUpdatingContext;

  return (
    <div
      className={cn(
        'origin-top overflow-hidden transition-[max-height,margin,opacity,transform] duration-200 motion-reduce:transition-none',
        EASE_OUT_CLASS,
        state.isExiting
          ? 'my-0 max-h-0 -translate-y-0.5 scale-[0.99] opacity-0'
          : 'my-2 max-h-28 translate-y-0 scale-100 opacity-100'
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 rounded-xl border px-3 py-2 transition-[background-color,border-color,opacity] duration-150 motion-reduce:transition-none',
          EASE_OUT_CLASS,
          attachment.isIncludedInContext
            ? 'border-border/70 bg-background/60'
            : 'border-border/60 bg-muted/25'
        )}
      >
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

        <AttachmentContextCheckbox
          attachmentId={attachment.id}
          isChecked={attachment.isIncludedInContext}
          isDisabled={isRowDisabled}
          onCheckedChange={onToggleContext}
        />

        <div className="flex shrink-0 items-center">
          <Button
            aria-label={
              state.isConfirmingRemoval
                ? `Cancelar eliminacion de ${attachment.name}`
                : `Quitar ${attachment.name}`
            }
            className={cn(
              state.isConfirmingRemoval ? 'text-destructive hover:text-destructive' : undefined
            )}
            disabled={isRowDisabled}
            onClick={state.isConfirmingRemoval ? onCancelRemove : onArmRemove}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <Trash2 />
          </Button>

          <AttachmentInlineRemoveConfirm
            isDisabled={isRowDisabled}
            isOpen={state.isConfirmingRemoval}
            onCancel={onCancelRemove}
            onConfirm={onConfirmRemove}
          />
        </div>
      </div>
    </div>
  );
}

function AttachmentsContextList({
  attachments,
  confirmingAttachmentId,
  exitingAttachmentIds,
  isSubmitting,
  onArmRemove,
  onCancelRemove,
  onConfirmRemove,
  onToggleContext,
  removingAttachmentIds,
  updatingAttachmentIds,
}: {
  attachments: ChatAttachment[];
  confirmingAttachmentId: string | null;
  exitingAttachmentIds: Set<string>;
  isSubmitting: boolean;
  onArmRemove: (attachmentId: string) => void;
  onCancelRemove: (attachmentId: string) => void;
  onConfirmRemove: (attachment: ChatAttachment, restoreIndex: number) => void;
  onToggleContext: (attachment: ChatAttachment, isIncludedInContext: boolean) => void;
  removingAttachmentIds: Set<string>;
  updatingAttachmentIds: Set<string>;
}) {
  if (!attachments.length) {
    return null;
  }

  return (
    <>
      {attachments.map((attachment, index) => (
        <AttachmentContextItem
          key={attachment.id}
          attachment={attachment}
          state={{
            isConfirmingRemoval: confirmingAttachmentId === attachment.id,
            isDisabled: isSubmitting,
            isExiting: exitingAttachmentIds.has(attachment.id),
            isRemoving: removingAttachmentIds.has(attachment.id),
            isUpdatingContext: updatingAttachmentIds.has(attachment.id),
          }}
          onArmRemove={() => {
            onArmRemove(attachment.id);
          }}
          onCancelRemove={() => {
            onCancelRemove(attachment.id);
          }}
          onConfirmRemove={() => {
            onConfirmRemove(attachment, index);
          }}
          onToggleContext={(isIncludedInContext) => {
            onToggleContext(attachment, isIncludedInContext);
          }}
        />
      ))}
    </>
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
  onSetAttachmentIncludedInContext,
}: ComposerAttachmentsContextModalProps) {
  const isDropOverlayVisible = dropOverlayState !== 'idle';
  const {
    confirmingAttachmentId,
    exitingAttachmentIds,
    optimisticAttachments,
    removingAttachmentIds,
    setConfirmingAttachmentId,
    toggleContext,
    removeAttachment,
    updatingAttachmentIds,
  } = useOptimisticAttachmentsState({
    attachments,
    isSubmitting,
    onRemoveAttachment,
    onSetAttachmentIncludedInContext,
  });
  const contextAttachmentCount = getIncludedChatAttachments(optimisticAttachments).length;

  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogContent className="w-[min(92vw,46rem)]">
        <DialogHeader>
          <DialogTitle>Archivos en contexto</DialogTitle>
          <DialogDescription>
            Los archivos quedan guardados hasta que los elimines. Puedes quitarlos del contexto sin
            borrarlos de la sesion.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {contextAttachmentCount} en contexto / {optimisticAttachments.length} guardados
          </p>
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

          {optimisticAttachments.length ? (
            <ScrollArea className="max-h-72 pr-1">
              <AttachmentsContextList
                attachments={optimisticAttachments}
                confirmingAttachmentId={confirmingAttachmentId}
                exitingAttachmentIds={exitingAttachmentIds}
                isSubmitting={isSubmitting}
                onArmRemove={(attachmentId) => {
                  setConfirmingAttachmentId(attachmentId);
                }}
                onCancelRemove={(attachmentId) => {
                  setConfirmingAttachmentId((currentId) =>
                    currentId === attachmentId ? null : currentId
                  );
                }}
                onConfirmRemove={removeAttachment}
                onToggleContext={(attachment, isIncludedInContext) => {
                  void toggleContext(attachment, isIncludedInContext);
                }}
                removingAttachmentIds={removingAttachmentIds}
                updatingAttachmentIds={updatingAttachmentIds}
              />
            </ScrollArea>
          ) : (
            <Empty className="rounded-xl border-border/60 p-6">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileArchive />
                </EmptyMedia>
                <EmptyTitle>Sin archivos guardados</EmptyTitle>
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
