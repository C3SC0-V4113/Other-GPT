import { useCallback } from 'react';

import { getErrorMessage } from '@/components/chat/chat-controller-errors';
import {
  isSupportedChatAttachment,
  MAX_ATTACHMENTS_PER_SESSION,
  MAX_ATTACHMENTS_PER_UPLOAD,
  MAX_ATTACHMENT_SIZE_BYTES,
} from '@/lib/chat-attachments';
import { parseApiErrorFromResponse, parseUploadChatAttachmentsResponse } from '@/lib/chat-dtos';

import type { ChatAction } from '@/components/chat/chat-controller-actions';
import type { ChatAttachment } from '@/lib/chat-attachments';
import type { Dispatch } from 'react';

interface UseChatAttachmentsEffectsParams {
  composer: {
    attachments: ChatAttachment[];
  };
  deps: {
    dispatch: Dispatch<ChatAction>;
  };
  request: {
    isSubmitting: boolean;
  };
}

function isImageFile(file: File): boolean {
  return file.type.toLowerCase().startsWith('image/');
}

function getAttachmentValidationError(file: File): string | null {
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return `${file.name}: supera el limite de 20MB.`;
  }

  if (!isSupportedChatAttachment({ filename: file.name, mimeType: file.type })) {
    return `${file.name}: formato no soportado.`;
  }

  return null;
}

export function useChatAttachmentsEffects({
  composer,
  deps,
  request,
}: UseChatAttachmentsEffectsParams) {
  const { attachments } = composer;
  const { dispatch } = deps;
  const { isSubmitting } = request;

  const addFilesAsAttachments = useCallback(
    async (files: File[]) => {
      if (!files.length || isSubmitting) {
        return 0;
      }

      const remainingSlots = MAX_ATTACHMENTS_PER_SESSION - attachments.length;

      if (remainingSlots <= 0) {
        dispatch({
          payload: `Limite alcanzado: maximo ${MAX_ATTACHMENTS_PER_SESSION} adjuntos por sesion.`,
          type: 'feedback/set-error-message',
        });
        return 0;
      }

      const acceptedFiles: File[] = [];
      const validationErrors: string[] = [];

      for (const file of files) {
        const validationError = getAttachmentValidationError(file);

        if (validationError) {
          validationErrors.push(validationError);
          continue;
        }

        acceptedFiles.push(file);
      }

      const cappedByUpload = acceptedFiles.slice(0, MAX_ATTACHMENTS_PER_UPLOAD);
      const cappedBySession = cappedByUpload.slice(0, remainingSlots);

      if (acceptedFiles.length > MAX_ATTACHMENTS_PER_UPLOAD) {
        validationErrors.push(`Solo se permiten ${MAX_ATTACHMENTS_PER_UPLOAD} archivos por carga.`);
      }

      if (cappedByUpload.length > remainingSlots) {
        validationErrors.push(
          `Solo quedan ${remainingSlots} cupos de adjuntos en la sesion actual.`
        );
      }

      if (!cappedBySession.length) {
        dispatch({
          payload: validationErrors[0] ?? 'No se pudieron adjuntar archivos.',
          type: 'feedback/set-error-message',
        });
        return 0;
      }

      dispatch({ payload: '', type: 'feedback/set-error-message' });

      const formData = new FormData();

      for (const file of cappedBySession) {
        formData.append('files', file);
      }

      try {
        const response = await fetch('/api/chat/attachments', {
          body: formData,
          method: 'POST',
        });

        if (!response.ok) {
          const errorMessage = await parseApiErrorFromResponse(
            response,
            'No fue posible subir archivos.'
          );
          throw new Error(errorMessage);
        }

        const payload = await response.json();
        const parsedPayload = parseUploadChatAttachmentsResponse(payload);

        if (!parsedPayload.ok) {
          throw new Error(parsedPayload.error);
        }

        const nextAttachments = parsedPayload.data.attachments.map((attachment, index) => {
          const matchingFile = cappedBySession[index];
          const previewUrl =
            matchingFile && isImageFile(matchingFile) ? URL.createObjectURL(matchingFile) : null;

          return {
            fileId: '',
            id: attachment.id,
            kind: attachment.kind,
            mimeType: attachment.mimeType,
            name: attachment.name,
            previewUrl,
            sizeBytes: attachment.sizeBytes,
            uploadedAt: attachment.uploadedAt,
          };
        });

        dispatch({ payload: nextAttachments, type: 'composer/add-attachments' });

        if (validationErrors.length) {
          dispatch({
            payload: validationErrors[0],
            type: 'feedback/set-error-message',
          });
        }
        return nextAttachments.length;
      } catch (error) {
        const resolvedError = getErrorMessage(error);
        dispatch({ payload: resolvedError, type: 'feedback/set-error-message' });
        throw error;
      }
    },
    [attachments.length, dispatch, isSubmitting]
  );

  const removeAttachment = useCallback(
    async (attachmentId: string) => {
      if (!attachmentId || isSubmitting) {
        return false;
      }

      dispatch({ payload: '', type: 'feedback/set-error-message' });

      try {
        const response = await fetch(`/api/chat/attachments/${attachmentId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorMessage = await parseApiErrorFromResponse(
            response,
            'No fue posible eliminar el adjunto.'
          );
          throw new Error(errorMessage);
        }

        dispatch({
          payload: { attachmentId },
          type: 'composer/remove-attachment',
        });
        return true;
      } catch (error) {
        const resolvedError = getErrorMessage(error);
        dispatch({ payload: resolvedError, type: 'feedback/set-error-message' });
        return false;
      }
    },
    [dispatch, isSubmitting]
  );

  return {
    addFilesAsAttachments,
    removeAttachment,
  };
}
