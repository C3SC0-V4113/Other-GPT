import { useTranslations } from 'next-intl';
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

type AttachmentValidationError =
  | { key: 'attachmentTooLarge'; params: { name: string } }
  | { key: 'attachmentUnsupported'; params: { name: string } };

function isImageFile(file: File): boolean {
  return file.type.toLowerCase().startsWith('image/');
}

function getAttachmentValidationError(file: File): AttachmentValidationError | null {
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return { key: 'attachmentTooLarge', params: { name: file.name } };
  }

  if (!isSupportedChatAttachment({ filename: file.name, mimeType: file.type })) {
    return { key: 'attachmentUnsupported', params: { name: file.name } };
  }

  return null;
}

export function useChatAttachmentsEffects({
  composer,
  deps,
  request,
}: UseChatAttachmentsEffectsParams) {
  const t = useTranslations('errors');
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
          payload: t('attachmentSessionLimit', { max: MAX_ATTACHMENTS_PER_SESSION }),
          type: 'feedback/set-error-message',
        });
        return 0;
      }

      const acceptedFiles: File[] = [];
      const validationErrors: string[] = [];

      for (const file of files) {
        const validationError = getAttachmentValidationError(file);

        if (validationError) {
          validationErrors.push(t(validationError.key, validationError.params));
          continue;
        }

        acceptedFiles.push(file);
      }

      const cappedByUpload = acceptedFiles.slice(0, MAX_ATTACHMENTS_PER_UPLOAD);
      const cappedBySession = cappedByUpload.slice(0, remainingSlots);

      if (acceptedFiles.length > MAX_ATTACHMENTS_PER_UPLOAD) {
        validationErrors.push(t('attachmentUploadLimit', { max: MAX_ATTACHMENTS_PER_UPLOAD }));
      }

      if (cappedByUpload.length > remainingSlots) {
        validationErrors.push(t('attachmentRemainingSlots', { remaining: remainingSlots }));
      }

      if (!cappedBySession.length) {
        dispatch({
          payload: validationErrors[0] ?? t('attachFailed'),
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
          const errorMessage = await parseApiErrorFromResponse(response, t('uploadFailed'));
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
            isIncludedInContext: attachment.isIncludedInContext,
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
    [attachments.length, dispatch, isSubmitting, t]
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
          const errorMessage = await parseApiErrorFromResponse(response, t('removeFailed'));
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
    [dispatch, isSubmitting, t]
  );

  const setAttachmentIncludedInContext = useCallback(
    async (attachmentId: string, isIncludedInContext: boolean) => {
      if (!attachmentId || isSubmitting) {
        return false;
      }

      dispatch({ payload: '', type: 'feedback/set-error-message' });

      try {
        const response = await fetch(`/api/chat/attachments/${attachmentId}`, {
          body: JSON.stringify({ isIncludedInContext }),
          headers: { 'content-type': 'application/json' },
          method: 'PATCH',
        });

        if (!response.ok) {
          const errorMessage = await parseApiErrorFromResponse(response, t('updateFailed'));
          throw new Error(errorMessage);
        }

        dispatch({
          payload: { attachmentId, isIncludedInContext },
          type: 'composer/set-attachment-context',
        });
        return true;
      } catch (error) {
        const resolvedError = getErrorMessage(error);
        dispatch({ payload: resolvedError, type: 'feedback/set-error-message' });
        return false;
      }
    },
    [dispatch, isSubmitting, t]
  );

  return {
    addFilesAsAttachments,
    removeAttachment,
    setAttachmentIncludedInContext,
  };
}
