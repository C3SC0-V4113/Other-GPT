'use client';

import { FileArchive, Paperclip } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AttachmentsContextList } from '@/components/chat/composer/attachments-context-modal/attachments-context-list';
import {
  AttachmentsContextModalProvider,
  useAttachmentsContextModalState,
} from '@/components/chat/composer/attachments-context-modal/attachments-context-modal-context';
import { type ComposerAttachmentsContextModalProps } from '@/components/chat/composer/attachments-context-modal/types';
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
import { cn } from '@/lib/utils';

type ComposerAttachmentsContextModalContentProps = Omit<
  ComposerAttachmentsContextModalProps,
  'attachments' | 'isSubmitting' | 'onRemoveAttachment' | 'onSetAttachmentIncludedInContext'
>;

function ComposerAttachmentsContextModalContent({
  dropErrorMessage,
  dropOverlayMessage,
  dropOverlayState,
  getDropzoneInputProps,
  getDropzoneRootProps,
  isOpen,
  onAddFiles,
  onOpenChange,
}: ComposerAttachmentsContextModalContentProps) {
  const t = useTranslations('attachmentsModal');
  const isDropOverlayVisible = dropOverlayState !== 'idle';
  const { attachments, contextAttachmentCount, isSubmitting } = useAttachmentsContextModalState();

  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogContent className="max-h-[min(88dvh,42rem)] w-[min(92vw,46rem)] gap-0 overflow-hidden p-0 sm:max-h-[min(85dvh,44rem)]">
        <DialogHeader className="border-b px-4 py-4 sm:px-5">
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription className="mt-1 leading-relaxed">{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-muted-foreground">
            {t('summary', { context: contextAttachmentCount, total: attachments.length })}
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
            {t('addFiles')}
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

            {attachments.length ? (
              <ScrollArea className="h-full min-h-0 pr-2">
                <AttachmentsContextList />
              </ScrollArea>
            ) : (
              <Empty className="rounded-xl border-border/60 p-6 sm:p-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileArchive />
                  </EmptyMedia>
                  <EmptyTitle>{t('emptyTitle')}</EmptyTitle>
                  <EmptyDescription>{t('emptyDescription')}</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    className="w-full sm:w-auto"
                    disabled={isSubmitting}
                    onClick={onAddFiles}
                    type="button"
                  >
                    <Paperclip data-icon="inline-start" />
                    {t('attachFiles')}
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
              {t('close')}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ComposerAttachmentsContextModal({
  attachments,
  isSubmitting,
  onRemoveAttachment,
  onSetAttachmentIncludedInContext,
  ...contentProps
}: ComposerAttachmentsContextModalProps) {
  return (
    <AttachmentsContextModalProvider
      attachments={attachments}
      isSubmitting={isSubmitting}
      onRemoveAttachment={onRemoveAttachment}
      onSetAttachmentIncludedInContext={onSetAttachmentIncludedInContext}
    >
      <ComposerAttachmentsContextModalContent {...contentProps} />
    </AttachmentsContextModalProvider>
  );
}
