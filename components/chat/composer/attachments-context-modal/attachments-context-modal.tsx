'use client';

import { FileArchive, Paperclip } from 'lucide-react';

import { AttachmentsContextList } from '@/components/chat/composer/attachments-context-modal/attachments-context-list';
import { type ComposerAttachmentsContextModalProps } from '@/components/chat/composer/attachments-context-modal/types';
import { useOptimisticAttachmentsState } from '@/components/chat/composer/attachments-context-modal/use-optimistic-attachments-state';
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
import { getIncludedChatAttachments } from '@/lib/chat-attachments';
import { cn } from '@/lib/utils';

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
    removeAttachment,
    setConfirmingAttachmentId,
    toggleContext,
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
      <DialogContent className="max-h-[min(88dvh,42rem)] w-[min(92vw,46rem)] gap-0 overflow-hidden p-0 sm:max-h-[min(85dvh,44rem)]">
        <DialogHeader className="border-b px-4 py-4 sm:px-5">
          <DialogTitle>Archivos en contexto</DialogTitle>
          <DialogDescription className="mt-1 leading-relaxed">
            Los archivos quedan guardados hasta que los elimines. Puedes quitarlos del contexto sin
            borrarlos de la sesion.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-muted-foreground">
            {contextAttachmentCount} en contexto / {optimisticAttachments.length} guardados
          </p>
          <Button
            className="w-full sm:w-auto"
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

        <div className="min-h-0 flex-1 px-4 py-3 sm:px-5">
          <div
            {...getDropzoneRootProps({
              className:
                'relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-muted/20 p-3 outline-none focus-visible:ring-2 focus-visible:ring-primary',
            })}
          >
            <input {...getDropzoneInputProps()} />

            {optimisticAttachments.length ? (
              <ScrollArea className="h-full min-h-0 pr-2">
                <AttachmentsContextList
                  attachments={optimisticAttachments}
                  confirmingAttachmentId={confirmingAttachmentId}
                  exitingAttachmentIds={exitingAttachmentIds}
                  isSubmitting={isSubmitting}
                  onCancelRemove={(attachmentId) => {
                    setConfirmingAttachmentId((currentId) =>
                      currentId === attachmentId ? null : currentId
                    );
                  }}
                  onConfirmRemove={removeAttachment}
                  onRequestRemove={(attachmentId) => {
                    setConfirmingAttachmentId(attachmentId);
                  }}
                  onToggleContext={(attachment, isIncludedInContext) => {
                    void toggleContext(attachment, isIncludedInContext);
                  }}
                  removingAttachmentIds={removingAttachmentIds}
                  updatingAttachmentIds={updatingAttachmentIds}
                />
              </ScrollArea>
            ) : (
              <Empty className="rounded-xl border-border/60 p-6 sm:p-8">
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
                  <Button
                    className="w-full sm:w-auto"
                    disabled={isSubmitting}
                    onClick={onAddFiles}
                    type="button"
                  >
                    <Paperclip data-icon="inline-start" />
                    Adjuntar archivos
                  </Button>
                </EmptyContent>
              </Empty>
            )}

            {isDropOverlayVisible ? (
              <div
                className={cn(
                  'pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed bg-muted/40 px-4 text-center text-sm transition duration-150',
                  dropOverlayState === 'dragReject'
                    ? 'border-destructive text-destructive'
                    : 'border-primary text-foreground'
                )}
              >
                <span>{dropOverlayMessage}</span>
              </div>
            ) : null}
          </div>
        </div>

        {dropErrorMessage ? (
          <div className="px-4 pb-3 sm:px-5">
            <p aria-live="polite" className="text-xs text-destructive">
              {dropErrorMessage}
            </p>
          </div>
        ) : null}

        <DialogFooter className="border-t px-4 py-3 sm:px-5">
          <DialogClose asChild>
            <Button className="w-full sm:w-auto" type="button" variant="outline">
              Cerrar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
