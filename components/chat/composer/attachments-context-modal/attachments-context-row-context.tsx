'use client';

import { createContext, use, useCallback, useMemo, type ReactNode } from 'react';

import {
  useAttachmentsContextModalActions,
  useAttachmentsContextModalState,
} from '@/components/chat/composer/attachments-context-modal/attachments-context-modal-context';

import type { ChatAttachment } from '@/lib/chat-attachments';

interface AttachmentsContextRowProviderProps {
  attachment: ChatAttachment;
  children: ReactNode;
  restoreIndex: number;
}

interface AttachmentsContextRowValue {
  attachment: ChatAttachment;
  isConfirmingRemove: boolean;
  isDisabled: boolean;
  isExiting: boolean;
  isRemoving: boolean;
  isUpdatingContext: boolean;
  onCancelRemove: () => void;
  onConfirmRemove: () => void;
  onRequestRemove: () => void;
  onToggleContext: (isIncludedInContext: boolean) => void;
}

const AttachmentsContextRowContext = createContext<AttachmentsContextRowValue | null>(null);

export function AttachmentsContextRowProvider({
  attachment,
  children,
  restoreIndex,
}: AttachmentsContextRowProviderProps) {
  const state = useAttachmentsContextModalState();
  const actions = useAttachmentsContextModalActions();

  const isRemoving = state.removingAttachmentIds.has(attachment.id);
  const isUpdatingContext = state.updatingAttachmentIds.has(attachment.id);

  const onCancelRemove = useCallback(() => {
    actions.cancelRemoveConfirmation(attachment.id);
  }, [actions, attachment.id]);

  const onConfirmRemove = useCallback(() => {
    actions.removeAttachment(attachment, restoreIndex);
  }, [actions, attachment, restoreIndex]);

  const onRequestRemove = useCallback(() => {
    actions.requestRemoveConfirmation(attachment.id);
  }, [actions, attachment.id]);

  const onToggleContext = useCallback(
    (isIncludedInContext: boolean) => {
      void actions.toggleContext(attachment, isIncludedInContext);
    },
    [actions, attachment]
  );

  const value = useMemo<AttachmentsContextRowValue>(
    () => ({
      attachment,
      isConfirmingRemove: state.confirmingAttachmentId === attachment.id,
      isDisabled: state.isSubmitting || isRemoving || isUpdatingContext,
      isExiting: state.exitingAttachmentIds.has(attachment.id),
      isRemoving,
      isUpdatingContext,
      onCancelRemove,
      onConfirmRemove,
      onRequestRemove,
      onToggleContext,
    }),
    [
      attachment,
      isRemoving,
      isUpdatingContext,
      onCancelRemove,
      onConfirmRemove,
      onRequestRemove,
      onToggleContext,
      state.confirmingAttachmentId,
      state.exitingAttachmentIds,
      state.isSubmitting,
    ]
  );

  return (
    <AttachmentsContextRowContext.Provider value={value}>
      {children}
    </AttachmentsContextRowContext.Provider>
  );
}

export function useAttachmentsContextRow() {
  const context = use(AttachmentsContextRowContext);

  if (!context) {
    throw new Error('useAttachmentsContextRow must be used within AttachmentsContextRowProvider.');
  }

  return context;
}
