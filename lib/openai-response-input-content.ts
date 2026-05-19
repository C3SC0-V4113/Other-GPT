import type { ChatAttachment } from '@/lib/chat-attachments';
import type { ResponseInputContent } from 'openai/resources/responses/responses';

function toResponseInputContentFromAttachment(attachment: ChatAttachment): ResponseInputContent {
  if (attachment.kind === 'image') {
    const inputImage: ResponseInputContent = {
      detail: 'auto',
      type: 'input_image',
    };
    inputImage['file_id'] = attachment.fileId;

    return inputImage;
  }

  const inputFile: ResponseInputContent = {
    type: 'input_file',
  };
  inputFile['file_id'] = attachment.fileId;

  return inputFile;
}

export function toResponseInputContentFromAttachments(
  attachments: ChatAttachment[]
): ResponseInputContent[] {
  return attachments.map((attachment) => toResponseInputContentFromAttachment(attachment));
}
