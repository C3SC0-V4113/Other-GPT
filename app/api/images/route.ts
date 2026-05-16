import { cookies } from 'next/headers';
import OpenAI from 'openai';

import {
  appendSessionMessage,
  CHAT_SESSION_COOKIE_NAME,
  type ChatImageAspectRatio,
} from '@/lib/chat-session-store';

interface GenerateImageRequestBody {
  aspectRatio?: unknown;
  prompt?: unknown;
}

function isAspectRatio(value: unknown): value is ChatImageAspectRatio {
  return value === 'auto' || value === '1:1' || value === '16:9' || value === '9:16';
}

function getImageSizeFromAspectRatio(
  aspectRatio: ChatImageAspectRatio
): '1024x1024' | '1024x1536' | '1536x1024' | 'auto' {
  if (aspectRatio === '1:1') {
    return '1024x1024';
  }

  if (aspectRatio === '16:9') {
    return '1536x1024';
  }

  if (aspectRatio === '9:16') {
    return '1024x1536';
  }

  return 'auto';
}

function getImageMimeType(outputFormat: 'jpeg' | 'png' | 'webp' | null | undefined): string {
  if (outputFormat === 'jpeg') {
    return 'image/jpeg';
  }

  if (outputFormat === 'webp') {
    return 'image/webp';
  }

  return 'image/png';
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: 'OPENAI_API_KEY is missing.' }, { status: 500 });
  }

  let body: GenerateImageRequestBody;

  try {
    body = (await request.json()) as GenerateImageRequestBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const rawPrompt = typeof body.prompt === 'string' ? body.prompt : '';
  const prompt = rawPrompt.trim();

  if (!prompt) {
    return Response.json({ error: 'Prompt is required.' }, { status: 400 });
  }

  if (!isAspectRatio(body.aspectRatio)) {
    return Response.json({ error: 'Invalid aspect ratio.' }, { status: 400 });
  }

  const aspectRatio = body.aspectRatio;
  const cookieStore = await cookies();
  const existingSessionId = cookieStore.get(CHAT_SESSION_COOKIE_NAME)?.value;
  const sessionId = existingSessionId ?? crypto.randomUUID();

  if (!existingSessionId) {
    cookieStore.set(CHAT_SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
  const size = getImageSizeFromAspectRatio(aspectRatio);

  try {
    const imageRequest: Parameters<typeof openai.images.generate>[0] = {
      model,
      prompt,
      size,
      stream: false,
    };
    imageRequest['output_format'] = 'png';
    const response = await openai.images.generate(imageRequest);

    if (!('data' in response)) {
      return Response.json(
        { error: 'Image generation stream is not supported here.' },
        { status: 502 }
      );
    }

    const firstImage = response.data?.[0];
    const imageBase64 = firstImage?.b64_json;

    if (!imageBase64) {
      return Response.json(
        { error: 'Image generation did not return image data.' },
        { status: 502 }
      );
    }

    const mimeType = getImageMimeType('png');

    appendSessionMessage(sessionId, {
      content: { text: prompt, type: 'text' },
      role: 'user',
    });
    appendSessionMessage(sessionId, {
      content: {
        aspectRatio,
        imageBase64,
        mimeType,
        prompt,
        type: 'image',
      },
      role: 'assistant',
    });

    return Response.json({
      aspectRatio,
      imageBase64,
      mimeType,
      prompt,
    });
  } catch {
    return Response.json({ error: 'Unable to generate image right now.' }, { status: 502 });
  }
}
