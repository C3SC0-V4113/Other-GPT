import { describe, expect, it } from 'vitest';

import {
  parseApiErrorFromResponse,
  parseApiErrorMessage,
  parseChatRequestBody,
  parseGenerateImageRequestBody,
  parseGenerateImageStreamEvent,
} from '@/lib/chat-dtos';

describe('parseChatRequestBody', () => {
  it('rejects non-object payloads', () => {
    expect(parseChatRequestBody(null)).toEqual({ error: 'Invalid JSON body.', ok: false });
  });

  it('requires a non-empty message', () => {
    expect(parseChatRequestBody({ message: '   ' })).toEqual({
      error: 'Message is required.',
      ok: false,
    });
  });

  it('trims valid messages', () => {
    expect(parseChatRequestBody({ message: '  hola  ' })).toEqual({
      data: { message: 'hola' },
      ok: true,
    });
  });
});

describe('parseGenerateImageRequestBody', () => {
  it('requires a prompt', () => {
    expect(parseGenerateImageRequestBody({ aspectRatio: '1:1', prompt: '' })).toEqual({
      error: 'Prompt is required.',
      ok: false,
    });
  });

  it('rejects unsupported aspect ratios', () => {
    expect(parseGenerateImageRequestBody({ aspectRatio: '4:3', prompt: 'logo' })).toEqual({
      error: 'Invalid aspect ratio.',
      ok: false,
    });
  });

  it.each(['auto', '1:1', '16:9', '9:16'])('accepts %s aspect ratio', (aspectRatio) => {
    expect(parseGenerateImageRequestBody({ aspectRatio, prompt: '  logo  ' })).toEqual({
      data: { aspectRatio, prompt: 'logo' },
      ok: true,
    });
  });
});

describe('parseGenerateImageStreamEvent', () => {
  it('parses complete image events', () => {
    expect(
      parseGenerateImageStreamEvent({
        aspectRatio: '16:9',
        imageBase64: 'abc',
        mimeType: 'image/png',
        prompt: 'banner',
        type: 'complete',
      })
    ).toEqual({
      data: {
        aspectRatio: '16:9',
        imageBase64: 'abc',
        mimeType: 'image/png',
        prompt: 'banner',
        type: 'complete',
      },
      ok: true,
    });
  });

  it('requires partial image indexes for partial events', () => {
    expect(
      parseGenerateImageStreamEvent({
        aspectRatio: '1:1',
        imageBase64: 'abc',
        mimeType: 'image/png',
        prompt: 'avatar',
        type: 'partial_image',
      })
    ).toEqual({ error: 'Invalid image stream event received.', ok: false });
  });

  it('parses stream error events', () => {
    expect(parseGenerateImageStreamEvent({ message: 'failed', type: 'error' })).toEqual({
      data: { message: 'failed', type: 'error' },
      ok: true,
    });
  });
});

describe('API error parsing', () => {
  it('returns trimmed JSON error messages', () => {
    expect(parseApiErrorMessage({ error: '  request failed  ' })).toBe('request failed');
  });

  it('falls back to response text when JSON error is unavailable', async () => {
    const response = new Response('plain failure', { status: 502 });

    await expect(parseApiErrorFromResponse(response, 'Request failed.')).resolves.toBe(
      'plain failure'
    );
  });

  it('uses the fallback with status when response has no body', async () => {
    const response = new Response(null, { status: 503 });

    await expect(parseApiErrorFromResponse(response, 'Request failed.')).resolves.toBe(
      'Request failed. (HTTP 503)'
    );
  });
});
