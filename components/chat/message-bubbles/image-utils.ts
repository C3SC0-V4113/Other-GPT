import type { ChatImageAspectRatio } from '@/lib/chat-session-store';

export function getImageDimensions(aspectRatio: ChatImageAspectRatio): {
  height: number;
  width: number;
} {
  if (aspectRatio === '16:9') {
    return { height: 1024, width: 1536 };
  }

  if (aspectRatio === '9:16') {
    return { height: 1536, width: 1024 };
  }

  return { height: 1024, width: 1024 };
}

export function getImageMaxWidthClass(aspectRatio: ChatImageAspectRatio): string {
  if (aspectRatio === '9:16') {
    return 'max-w-60 md:max-w-72';
  }

  if (aspectRatio === '1:1' || aspectRatio === 'auto') {
    return 'max-w-96';
  }

  return 'max-w-full';
}

export function getImageFrameStyle(aspectRatio: ChatImageAspectRatio) {
  const { height, width } = getImageDimensions(aspectRatio);

  return { aspectRatio: `${width} / ${height}` };
}

function getImageFileExtension(mimeType: string): string {
  if (mimeType === 'image/jpeg') {
    return 'jpg';
  }

  if (mimeType === 'image/webp') {
    return 'webp';
  }

  return 'png';
}

export function buildImageDataUrl(mimeType: string, imageBase64: string): string {
  return `data:${mimeType};base64,${imageBase64}`;
}

export function buildDownloadFilename(prompt: string, mimeType: string): string {
  const slug = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  const baseName = slug || 'generated-image';
  return `${baseName}.${getImageFileExtension(mimeType)}`;
}
