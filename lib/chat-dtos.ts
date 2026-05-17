import type { ChatImageAspectRatio } from '@/lib/chat-session-store';

const chatImageAspectRatios = ['auto', '1:1', '16:9', '9:16'] as const;

export interface ChatRequestDto {
  message: string;
}

export interface GenerateImageRequestDto {
  aspectRatio: ChatImageAspectRatio;
  prompt: string;
}

export interface GenerateImageResponseDto {
  aspectRatio: ChatImageAspectRatio;
  imageBase64: string;
  mimeType: string;
  prompt: string;
}

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

export function parseGenerateImageResponse(
  payload: unknown
): ParseResult<GenerateImageResponseDto> {
  if (!isRecord(payload)) {
    return { error: 'Invalid image response received.', ok: false };
  }

  if (!isChatImageAspectRatio(payload.aspectRatio)) {
    return { error: 'Invalid image response received.', ok: false };
  }

  if (
    typeof payload.imageBase64 !== 'string' ||
    typeof payload.mimeType !== 'string' ||
    typeof payload.prompt !== 'string'
  ) {
    return { error: 'Invalid image response received.', ok: false };
  }

  return {
    data: {
      aspectRatio: payload.aspectRatio,
      imageBase64: payload.imageBase64,
      mimeType: payload.mimeType,
      prompt: payload.prompt,
    },
    ok: true,
  };
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
