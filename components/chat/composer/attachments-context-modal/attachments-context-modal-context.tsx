'use client';

import { createContext, use, useCallback, useMemo, type ReactNode } from 'react';

import { useOptimisticAttachmentsState } from '@/components/chat/composer/attachments-context-modal/use-optimistic-attachments-state';
import { getIncludedChatAttachments } from '@/lib/chat-attachments';

import type { ChatAttachment } from '@/lib/chat-attachments';

interface AttachmentsContextModalProviderProps {
  attachments: ChatAttachment[];
  children: ReactNode;
  isSubmitting: boolean;
  onRemoveAttachment: (attachmentId: string) => Promise<boolean>;
  onSetAttachmentIncludedInContext: (
    attachmentId: string,
    isIncludedInContext: boolean
  ) => Promise<boolean>;
}

interface AttachmentsContextModalStateValue {
  attachments: ChatAttachment[];
  confirmingAttachmentId: string | null;
  contextAttachmentCount: number;
  exitingAttachmentIds: Set<string>;
  isSubmitting: boolean;
  removingAttachmentIds: Set<string>;
  updatingAttachmentIds: Set<string>;
}

interface AttachmentsContextModalActionsValue {
  cancelRemoveConfirmation: (attachmentId: string) => void;
  removeAttachment: (attachment: ChatAttachment, restoreIndex: number) => void;
  requestRemoveConfirmation: (attachmentId: string) => void;
  toggleContext: (attachment: ChatAttachment, isIncludedInContext: boolean) => Promise<void>;
}

const AttachmentsContextModalStateContext = createContext<AttachmentsContextModalStateValue | null>(
  null
);
const AttachmentsContextModalActionsContext =
  createContext<AttachmentsContextModalActionsValue | null>(null);

export function AttachmentsContextModalProvider({
  attachments,
  children,
  isSubmitting,
  onRemoveAttachment,
  onSetAttachmentIncludedInContext,
}: AttachmentsContextModalProviderProps) {
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

  const requestRemoveConfirmation = useCallback(
    (attachmentId: string) => {
      setConfirmingAttachmentId(attachmentId);
    },
    [setConfirmingAttachmentId]
  );

  const cancelRemoveConfirmation = useCallback(
    (attachmentId: string) => {
      setConfirmingAttachmentId((currentId) => (currentId === attachmentId ? null : currentId));
    },
    [setConfirmingAttachmentId]
  );

  const stateValue = useMemo<AttachmentsContextModalStateValue>(
    () => ({
      attachments: optimisticAttachments,
      confirmingAttachmentId,
      contextAttachmentCount: getIncludedChatAttachments(optimisticAttachments).length,
      exitingAttachmentIds,
      isSubmitting,
      removingAttachmentIds,
      updatingAttachmentIds,
    }),
    [
      confirmingAttachmentId,
      exitingAttachmentIds,
      isSubmitting,
      optimisticAttachments,
      removingAttachmentIds,
      updatingAttachmentIds,
    ]
  );

  const actionsValue = useMemo<AttachmentsContextModalActionsValue>(
    () => ({
      cancelRemoveConfirmation,
      removeAttachment,
      requestRemoveConfirmation,
      toggleContext,
    }),
    [cancelRemoveConfirmation, removeAttachment, requestRemoveConfirmation, toggleContext]
  );

  return (
    <AttachmentsContextModalStateContext.Provider value={stateValue}>
      <AttachmentsContextModalActionsContext.Provider value={actionsValue}>
        {children}
      </AttachmentsContextModalActionsContext.Provider>
    </AttachmentsContextModalStateContext.Provider>
  );
}

export function useAttachmentsContextModalState() {
  const context = use(AttachmentsContextModalStateContext);

  if (!context) {
    throw new Error(
      'useAttachmentsContextModalState must be used within AttachmentsContextModalProvider.'
    );
  }

  return context;
}

export function useAttachmentsContextModalActions() {
  const context = use(AttachmentsContextModalActionsContext);

  if (!context) {
    throw new Error(
      'useAttachmentsContextModalActions must be used within AttachmentsContextModalProvider.'
    );
  }

  return context;
}
