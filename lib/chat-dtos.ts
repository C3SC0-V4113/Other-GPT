import type { ChatAttachmentKind } from '@/lib/chat-attachments';
import type { ChatImageAspectRatio } from '@/lib/chat-session-store';

const chatImageAspectRatios = ['auto', '1:1', '16:9', '9:16'] as const;

export interface ChatRequestDto {
  message: string;
}

interface ChatAttachmentDto {
  id: string;
  kind: ChatAttachmentKind;
  mimeType: string;
  name: string;
  sizeBytes: number;
  uploadedAt: number;
}

export interface UploadChatAttachmentsResponseDto {
  attachments: ChatAttachmentDto[];
}

export interface GenerateImageRequestDto {
  aspectRatio: ChatImageAspectRatio;
  prompt: string;
}

export type GenerateImageStreamEventDto =
  | {
      aspectRatio: ChatImageAspectRatio;
      imageBase64: string;
      mimeType: string;
      partialImageIndex: number;
      prompt: string;
      type: 'partial_image';
    }
  | {
      aspectRatio: ChatImageAspectRatio;
      imageBase64: string;
      mimeType: string;
      prompt: string;
      type: 'complete';
    }
  | {
      message: string;
      type: 'error';
    };

export interface SpeechRequestDto {
  text: string;
}

export interface TranscriptionResponseDto {
  text: string;
}

export type ParseResult<T> = { data: T; ok: true } | { error: string; ok: false };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isChatImageAspectRatio(value: unknown): value is ChatImageAspectRatio {
  return (
    value === chatImageAspectRatios[0] ||
    value === chatImageAspectRatios[1] ||
    value === chatImageAspectRatios[2] ||
    value === chatImageAspectRatios[3]
  );
}

export function parseChatRequestBody(payload: unknown): ParseResult<ChatRequestDto> {
  if (!isRecord(payload)) {
    return { error: 'Invalid JSON body.', ok: false };
  }

  const message = asTrimmedString(payload.message);

  if (!message) {
    return { error: 'Message is required.', ok: false };
  }

  return { data: { message }, ok: true };
}

export function parseUploadChatAttachmentsResponse(
  payload: unknown
): ParseResult<UploadChatAttachmentsResponseDto> {
  if (!isRecord(payload) || !Array.isArray(payload.attachments)) {
    return { error: 'Invalid attachment response received.', ok: false };
  }

  const attachments: ChatAttachmentDto[] = [];

  for (const item of payload.attachments) {
    if (!isRecord(item)) {
      return { error: 'Invalid attachment response received.', ok: false };
    }

    if (
      typeof item.id !== 'string' ||
      typeof item.name !== 'string' ||
      typeof item.mimeType !== 'string' ||
      typeof item.sizeBytes !== 'number' ||
      typeof item.uploadedAt !== 'number' ||
      !isChatAttachmentKind(item.kind)
    ) {
      return { error: 'Invalid attachment response received.', ok: false };
    }

    attachments.push({
      id: item.id,
      kind: item.kind,
      mimeType: item.mimeType,
      name: item.name,
      sizeBytes: item.sizeBytes,
      uploadedAt: item.uploadedAt,
    });
  }

  return { data: { attachments }, ok: true };
}

export function parseGenerateImageRequestBody(
  payload: unknown
): ParseResult<GenerateImageRequestDto> {
  if (!isRecord(payload)) {
    return { error: 'Invalid JSON body.', ok: false };
  }

  const prompt = asTrimmedString(payload.prompt);

  if (!prompt) {
    return { error: 'Prompt is required.', ok: false };
  }

  if (!isChatImageAspectRatio(payload.aspectRatio)) {
    return { error: 'Invalid aspect ratio.', ok: false };
  }

  return {
    data: {
      aspectRatio: payload.aspectRatio,
      prompt,
    },
    ok: true,
  };
}

export function parseSpeechRequestBody(payload: unknown): ParseResult<SpeechRequestDto> {
  if (!isRecord(payload)) {
    return { error: 'Invalid JSON body.', ok: false };
  }

  const text = asTrimmedString(payload.text);

  if (!text) {
    return { error: 'Text is required.', ok: false };
  }

  return { data: { text }, ok: true };
}

export function parseGenerateImageStreamEvent(
  payload: unknown
): ParseResult<GenerateImageStreamEventDto> {
  if (!isRecord(payload) || typeof payload.type !== 'string') {
    return { error: 'Invalid image stream event received.', ok: false };
  }

  if (payload.type === 'error') {
    if (typeof payload.message !== 'string') {
      return { error: 'Invalid image stream event received.', ok: false };
    }

    return {
      data: {
        message: payload.message,
        type: 'error',
      },
      ok: true,
    };
  }

  if (
    (payload.type === 'complete' || payload.type === 'partial_image') &&
    isChatImageAspectRatio(payload.aspectRatio) &&
    typeof payload.imageBase64 === 'string' &&
    typeof payload.mimeType === 'string' &&
    typeof payload.prompt === 'string'
  ) {
    if (payload.type === 'complete') {
      return {
        data: {
          aspectRatio: payload.aspectRatio,
          imageBase64: payload.imageBase64,
          mimeType: payload.mimeType,
          prompt: payload.prompt,
          type: 'complete',
        },
        ok: true,
      };
    }

    if (typeof payload.partialImageIndex !== 'number') {
      return { error: 'Invalid image stream event received.', ok: false };
    }

    return {
      data: {
        aspectRatio: payload.aspectRatio,
        imageBase64: payload.imageBase64,
        mimeType: payload.mimeType,
        partialImageIndex: payload.partialImageIndex,
        prompt: payload.prompt,
        type: 'partial_image',
      },
      ok: true,
    };
  }

  return { error: 'Invalid image stream event received.', ok: false };
}

export function parseTranscriptionResponse(
  payload: unknown
): ParseResult<TranscriptionResponseDto> {
  if (!isRecord(payload) || typeof payload.text !== 'string') {
    return { error: 'Invalid transcription response received.', ok: false };
  }

  return { data: { text: payload.text }, ok: true };
}

export function parseApiErrorMessage(payload: unknown): string | null {
  if (!isRecord(payload) || typeof payload.error !== 'string') {
    return null;
  }

  const trimmed = payload.error.trim();
  return trimmed || null;
}

export async function parseApiErrorFromResponse(
  response: Response,
  fallbackMessage: string
): Promise<string> {
  try {
    const jsonPayload = (await response.clone().json()) as unknown;
    const messageFromJson = parseApiErrorMessage(jsonPayload);

    if (messageFromJson) {
      return messageFromJson;
    }
  } catch {
    // Ignore and continue with text parsing fallback.
  }

  try {
    const responseText = (await response.text()).trim();

    if (responseText) {
      return responseText;
    }
  } catch {
    // Ignore and continue with final fallback.
  }

  return `${fallbackMessage} (HTTP ${response.status})`;
}

function isChatAttachmentKind(value: unknown): value is ChatAttachmentKind {
  return (
    value === 'document' ||
    value === 'image' ||
    value === 'markdown' ||
    value === 'other' ||
    value === 'pdf' ||
    value === 'presentation' ||
    value === 'spreadsheet'
  );
}
