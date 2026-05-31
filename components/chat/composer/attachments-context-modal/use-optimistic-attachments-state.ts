'use client';

import { useTranslations } from 'next-intl';
import { startTransition, useCallback, useEffect, useOptimistic, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { ChatAttachment } from '@/lib/chat-attachments';

type OptimisticAttachmentsAction =
  | { type: 'remove'; payload: { attachmentId: string } }
  | { type: 'restore'; payload: { attachment: ChatAttachment; restoreIndex: number } }
  | {
      type: 'set-context';
      payload: { attachmentId: string; isIncludedInContext: boolean };
    };

const ITEM_EXIT_DURATION_MS = 200;

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

interface UseOptimisticAttachmentsStateParams {
  attachments: ChatAttachment[];
  isSubmitting: boolean;
  onRemoveAttachment: (attachmentId: string) => Promise<boolean>;
  onSetAttachmentIncludedInContext: (
    attachmentId: string,
    isIncludedInContext: boolean
  ) => Promise<boolean>;
}

export function useOptimisticAttachmentsState({
  attachments,
  isSubmitting,
  onRemoveAttachment,
  onSetAttachmentIncludedInContext,
}: UseOptimisticAttachmentsStateParams) {
  const t = useTranslations('errors');
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
          toast.error(t('contextUpdateRetry'));
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
      t,
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
              toast.error(t('removeRetry'));
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
      t,
      updatingAttachmentIds,
    ]
  );

  return {
    confirmingAttachmentId,
    exitingAttachmentIds,
    optimisticAttachments,
    removingAttachmentIds,
    removeAttachment,
    setConfirmingAttachmentId,
    toggleContext,
    updatingAttachmentIds,
  };
}
