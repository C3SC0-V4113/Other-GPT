'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useDropzone, type Accept, type FileRejection } from 'react-dropzone';
import { toast } from 'sonner';

import {
  ComposerAttachmentsContextModal,
  type AttachmentsDropOverlayState,
} from '@/components/chat/composer/composer-attachments-context-modal';
import { getIncludedChatAttachments, MAX_ATTACHMENT_SIZE_BYTES } from '@/lib/chat-attachments';

import type { ChatAttachment } from '@/lib/chat-attachments';

interface ComposerAttachmentsUploaderProps {
  attachments: ChatAttachment[];
  children: (controls: {
    contextAttachmentCount: number;
    totalAttachmentCount: number;
    openContextModal: () => void;
    openFileDialog: () => void;
  }) => ReactNode;
  errorMessage: string;
  isSubmitting: boolean;
  onAddFiles: (files: File[]) => Promise<number>;
  onRemoveAttachment: (attachmentId: string) => Promise<boolean>;
  onSetAttachmentIncludedInContext: (
    attachmentId: string,
    isIncludedInContext: boolean
  ) => Promise<boolean>;
}

interface DropFeedbackState {
  composer: {
    errorMessage: string;
    overlayState: AttachmentsDropOverlayState;
  };
  modal: {
    errorMessage: string;
    overlayState: AttachmentsDropOverlayState;
  };
}

type OverlayStateUpdater =
  | AttachmentsDropOverlayState
  | ((currentState: AttachmentsDropOverlayState) => AttachmentsDropOverlayState);

interface UseAttachmentsDropzonesParams {
  isContextModalOpen: boolean;
  isSubmitting: boolean;
  onAddFiles: (files: File[]) => Promise<number>;
}

function getToastErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
}

function getOverlayMessage(state: AttachmentsDropOverlayState): string {
  if (state === 'processing') {
    return 'Procesando adjuntos...';
  }

  if (state === 'dragReject') {
    return 'Formato o tamano no valido.';
  }

  return 'Suelta para adjuntar.';
}

function useAttachmentsDropzones({
  isContextModalOpen,
  isSubmitting,
  onAddFiles,
}: UseAttachmentsDropzonesParams) {
  const [dropFeedback, setDropFeedback] = useState<DropFeedbackState>({
    composer: {
      errorMessage: '',
      overlayState: 'idle',
    },
    modal: {
      errorMessage: '',
      overlayState: 'idle',
    },
  });

  const setComposerDropOverlayState = useCallback((nextState: OverlayStateUpdater) => {
    setDropFeedback((currentState) => ({
      ...currentState,
      composer: {
        ...currentState.composer,
        overlayState:
          typeof nextState === 'function'
            ? nextState(currentState.composer.overlayState)
            : nextState,
      },
    }));
  }, []);

  const setModalDropOverlayState = useCallback((nextState: OverlayStateUpdater) => {
    setDropFeedback((currentState) => ({
      ...currentState,
      modal: {
        ...currentState.modal,
        overlayState:
          typeof nextState === 'function' ? nextState(currentState.modal.overlayState) : nextState,
      },
    }));
  }, []);

  const setComposerDropErrorMessage = useCallback((errorMessage: string) => {
    setDropFeedback((currentState) => ({
      ...currentState,
      composer: {
        ...currentState.composer,
        errorMessage,
      },
    }));
  }, []);

  const setModalDropErrorMessage = useCallback((errorMessage: string) => {
    setDropFeedback((currentState) => ({
      ...currentState,
      modal: {
        ...currentState.modal,
        errorMessage,
      },
    }));
  }, []);

  const clearComposerDropFeedback = useCallback(() => {
    setDropFeedback((currentState) => ({
      ...currentState,
      composer: {
        ...currentState.composer,
        errorMessage: '',
        overlayState:
          currentState.composer.overlayState === 'processing'
            ? currentState.composer.overlayState
            : 'idle',
      },
    }));
  }, []);

  const clearModalDropFeedback = useCallback(() => {
    setDropFeedback((currentState) => ({
      ...currentState,
      modal: {
        ...currentState.modal,
        errorMessage: '',
        overlayState:
          currentState.modal.overlayState === 'processing'
            ? currentState.modal.overlayState
            : 'idle',
      },
    }));
  }, []);

  const handleDrop = useCallback(
    async ({
      acceptedFiles,
      setOverlayState,
    }: {
      acceptedFiles: File[];
      setOverlayState: (nextState: OverlayStateUpdater) => void;
    }) => {
      if (!acceptedFiles.length || isSubmitting) {
        setOverlayState('idle');
        return;
      }

      setOverlayState('processing');

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
        setOverlayState('idle');
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

  const {
    getInputProps: getComposerInputProps,
    getRootProps: getComposerRootProps,
    isDragActive: isComposerDragActive,
    isDragReject: isComposerDragReject,
    open: openComposerFileDialog,
  } = useDropzone({
    accept: acceptedMimeTypes,
    disabled: isSubmitting || isContextModalOpen,
    maxSize: MAX_ATTACHMENT_SIZE_BYTES,
    noClick: true,
    noKeyboard: true,
    onDragEnter: () => {
      if (isSubmitting || isContextModalOpen) {
        return;
      }

      setComposerDropOverlayState('dragActive');
    },
    onDragLeave: () => {
      setComposerDropOverlayState((currentState) =>
        currentState === 'processing' ? currentState : 'idle'
      );
    },
    onDrop: (acceptedFiles: File[], rejections: FileRejection[]) => {
      if (rejections.length) {
        setComposerDropErrorMessage('Archivo rechazado: formato o tamano no permitido.');
        setComposerDropOverlayState('dragReject');
      }

      if (!rejections.length && !acceptedFiles.length) {
        setComposerDropOverlayState('idle');
      }

      if (acceptedFiles.length) {
        void handleDrop({
          acceptedFiles,
          setOverlayState: setComposerDropOverlayState,
        });
      }
    },
  });

  const {
    getInputProps: getModalInputProps,
    getRootProps: getModalRootProps,
    isDragActive: isModalDragActive,
    isDragReject: isModalDragReject,
    open: openModalFileDialog,
  } = useDropzone({
    accept: acceptedMimeTypes,
    disabled: isSubmitting || !isContextModalOpen,
    maxSize: MAX_ATTACHMENT_SIZE_BYTES,
    noClick: true,
    noKeyboard: true,
    onDragEnter: () => {
      if (isSubmitting || !isContextModalOpen) {
        return;
      }

      setModalDropOverlayState('dragActive');
    },
    onDragLeave: () => {
      setModalDropOverlayState((currentState) =>
        currentState === 'processing' ? currentState : 'idle'
      );
    },
    onDrop: (acceptedFiles: File[], rejections: FileRejection[]) => {
      if (rejections.length) {
        setModalDropErrorMessage('Archivo rechazado: formato o tamano no permitido.');
        setModalDropOverlayState('dragReject');
      }

      if (!rejections.length && !acceptedFiles.length) {
        setModalDropOverlayState('idle');
      }

      if (acceptedFiles.length) {
        void handleDrop({
          acceptedFiles,
          setOverlayState: setModalDropOverlayState,
        });
      }
    },
  });

  const openComposerDialog = useCallback(() => {
    clearComposerDropFeedback();
    openComposerFileDialog();
  }, [clearComposerDropFeedback, openComposerFileDialog]);

  const openModalDialog = useCallback(() => {
    clearModalDropFeedback();
    openModalFileDialog();
  }, [clearModalDropFeedback, openModalFileDialog]);

  const resolvedComposerDropOverlayState: AttachmentsDropOverlayState = isContextModalOpen
    ? 'idle'
    : dropFeedback.composer.overlayState === 'processing'
      ? 'processing'
      : isComposerDragReject
        ? 'dragReject'
        : isComposerDragActive
          ? 'dragActive'
          : dropFeedback.composer.overlayState;

  const resolvedModalDropOverlayState: AttachmentsDropOverlayState =
    dropFeedback.modal.overlayState === 'processing'
      ? 'processing'
      : isModalDragReject
        ? 'dragReject'
        : isModalDragActive
          ? 'dragActive'
          : dropFeedback.modal.overlayState;

  return {
    composer: {
      clearDropFeedback: clearComposerDropFeedback,
      errorMessage: dropFeedback.composer.errorMessage,
      getInputProps: getComposerInputProps,
      getOverlayMessage: () => getOverlayMessage(resolvedComposerDropOverlayState),
      getRootProps: getComposerRootProps,
      openFileDialog: openComposerDialog,
      shouldShowOverlay: resolvedComposerDropOverlayState !== 'idle',
    },
    modal: {
      clearDropFeedback: clearModalDropFeedback,
      errorMessage: dropFeedback.modal.errorMessage,
      getInputProps: getModalInputProps,
      getOverlayMessage: () => getOverlayMessage(resolvedModalDropOverlayState),
      getRootProps: getModalRootProps,
      openFileDialog: openModalDialog,
      resolvedOverlayState: resolvedModalDropOverlayState,
      setOverlayState: setModalDropOverlayState,
    },
  };
}

export function ComposerAttachmentsUploader({
  attachments,
  children,
  errorMessage,
  isSubmitting,
  onAddFiles,
  onRemoveAttachment,
  onSetAttachmentIncludedInContext,
}: ComposerAttachmentsUploaderProps) {
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const contextAttachmentCount = getIncludedChatAttachments(attachments).length;

  const dropzones = useAttachmentsDropzones({
    isContextModalOpen,
    isSubmitting,
    onAddFiles,
  });

  const openContextModal = useCallback(() => {
    setIsContextModalOpen(true);
  }, []);

  return (
    <div
      {...dropzones.composer.getRootProps({
        className: 'relative',
        onFocusCapture: dropzones.composer.clearDropFeedback,
        onKeyDownCapture: dropzones.composer.clearDropFeedback,
        onPointerDownCapture: dropzones.composer.clearDropFeedback,
      })}
    >
      <input {...dropzones.composer.getInputProps()} />

      {children({
        contextAttachmentCount,
        totalAttachmentCount: attachments.length,
        openContextModal,
        openFileDialog: dropzones.composer.openFileDialog,
      })}

      {dropzones.composer.shouldShowOverlay ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-muted/40 text-sm text-foreground transition duration-150">
          <span>{dropzones.composer.getOverlayMessage()}</span>
        </div>
      ) : null}

      <ComposerAttachmentsContextModal
        attachments={attachments}
        dropErrorMessage={dropzones.modal.errorMessage}
        dropOverlayMessage={dropzones.modal.getOverlayMessage()}
        dropOverlayState={dropzones.modal.resolvedOverlayState}
        getDropzoneInputProps={dropzones.modal.getInputProps}
        getDropzoneRootProps={dropzones.modal.getRootProps}
        isOpen={isContextModalOpen}
        isSubmitting={isSubmitting}
        onAddFiles={dropzones.modal.openFileDialog}
        onOpenChange={(nextOpen) => {
          setIsContextModalOpen(nextOpen);

          if (!nextOpen) {
            dropzones.modal.clearDropFeedback();
            dropzones.modal.setOverlayState('idle');
          }
        }}
        onRemoveAttachment={onRemoveAttachment}
        onSetAttachmentIncludedInContext={onSetAttachmentIncludedInContext}
      />

      {dropzones.composer.errorMessage || errorMessage ? (
        <p aria-live="polite" className="mt-1 text-xs text-destructive">
          {dropzones.composer.errorMessage || errorMessage}
        </p>
      ) : null}
    </div>
  );
}
