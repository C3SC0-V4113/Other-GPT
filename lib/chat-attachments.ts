export const MAX_ATTACHMENTS_PER_UPLOAD = 5;
export const MAX_ATTACHMENTS_PER_SESSION = 10;
export const MAX_ATTACHMENT_SIZE_BYTES = 20 * 1024 * 1024;

const supportedAttachmentExtensions = new Set([
  'csv',
  'doc',
  'docx',
  'gif',
  'jpeg',
  'jpg',
  'md',
  'markdown',
  'odp',
  'ods',
  'odt',
  'pdf',
  'png',
  'ppt',
  'pptx',
  'rtf',
  'txt',
  'webp',
  'xls',
  'xlsx',
]);

const supportedAttachmentMimeTypes = new Set([
  'application/csv',
  'application/msword',
  'application/pdf',
  'application/rtf',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/vnd.oasis.opendocument.presentation',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/csv',
  'text/markdown',
  'text/plain',
]);

const knownInferenceIncompatibleExtensions = new Set(['svg']);
const knownInferenceIncompatibleMimeTypes = new Set(['image/svg+xml']);

export type ChatAttachmentKind =
  | 'document'
  | 'image'
  | 'markdown'
  | 'other'
  | 'pdf'
  | 'presentation'
  | 'spreadsheet';

export interface ChatAttachment {
  fileId: string;
  id: string;
  kind: ChatAttachmentKind;
  mimeType: string;
  name: string;
  previewUrl?: string | null;
  sizeBytes: number;
  uploadedAt: number;
}

export interface ChatAttachmentSnapshot {
  id: string;
  kind: ChatAttachmentKind;
  mimeType: string;
  name: string;
  sizeBytes: number;
}

function getFileExtension(filename: string): string | null {
  const lastDotIndex = filename.lastIndexOf('.');

  if (lastDotIndex < 0 || lastDotIndex === filename.length - 1) {
    return null;
  }

  return filename.slice(lastDotIndex + 1).toLowerCase();
}

export function getChatAttachmentKind({
  filename,
  mimeType,
}: {
  filename: string;
  mimeType: string;
}): ChatAttachmentKind {
  const extension = getFileExtension(filename);
  const normalizedMimeType = mimeType.toLowerCase();

  if (normalizedMimeType.startsWith('image/')) {
    return 'image';
  }

  if (normalizedMimeType === 'application/pdf' || extension === 'pdf') {
    return 'pdf';
  }

  if (
    normalizedMimeType.includes('spreadsheet') ||
    normalizedMimeType.includes('excel') ||
    normalizedMimeType === 'text/csv' ||
    normalizedMimeType === 'application/csv' ||
    extension === 'csv' ||
    extension === 'xls' ||
    extension === 'xlsx' ||
    extension === 'ods'
  ) {
    return 'spreadsheet';
  }

  if (
    normalizedMimeType.includes('presentation') ||
    normalizedMimeType.includes('powerpoint') ||
    extension === 'ppt' ||
    extension === 'pptx' ||
    extension === 'odp'
  ) {
    return 'presentation';
  }

  if (normalizedMimeType === 'text/markdown' || extension === 'md' || extension === 'markdown') {
    return 'markdown';
  }

  if (
    normalizedMimeType.includes('wordprocessingml') ||
    normalizedMimeType.includes('msword') ||
    normalizedMimeType === 'text/plain' ||
    normalizedMimeType === 'application/rtf' ||
    normalizedMimeType === 'application/vnd.oasis.opendocument.text' ||
    extension === 'doc' ||
    extension === 'docx' ||
    extension === 'txt' ||
    extension === 'rtf' ||
    extension === 'odt'
  ) {
    return 'document';
  }

  return 'other';
}

export function isSupportedChatAttachment({
  filename,
  mimeType,
}: {
  filename: string;
  mimeType: string;
}): boolean {
  const normalizedMimeType = mimeType.toLowerCase();

  if (normalizedMimeType.startsWith('image/')) {
    return true;
  }

  if (supportedAttachmentMimeTypes.has(normalizedMimeType)) {
    return true;
  }

  const extension = getFileExtension(filename);

  return extension ? supportedAttachmentExtensions.has(extension) : false;
}

export function isKnownInferenceIncompatibleAttachment({
  filename,
  mimeType,
}: {
  filename: string;
  mimeType: string;
}): boolean {
  const normalizedMimeType = mimeType.toLowerCase();

  if (knownInferenceIncompatibleMimeTypes.has(normalizedMimeType)) {
    return true;
  }

  const extension = getFileExtension(filename);
  return extension ? knownInferenceIncompatibleExtensions.has(extension) : false;
}

export function toChatAttachmentSnapshot(attachment: ChatAttachment): ChatAttachmentSnapshot {
  return {
    id: attachment.id,
    kind: attachment.kind,
    mimeType: attachment.mimeType,
    name: attachment.name,
    sizeBytes: attachment.sizeBytes,
  };
}

export function formatAttachmentSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
