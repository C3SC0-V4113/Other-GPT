import type { ChatAttachment } from '@/lib/chat-attachments';
import type { DropzoneInputProps, DropzoneRootProps } from 'react-dropzone';

export type AttachmentsDropOverlayState = 'dragActive' | 'dragReject' | 'idle' | 'processing';

export interface ComposerAttachmentsContextModalProps {
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

export interface AttachmentContextRowState {
  isConfirmingRemove: boolean;
  isDisabled: boolean;
  isExiting: boolean;
  isRemoving: boolean;
  isUpdatingContext: boolean;
}
