import { cookies } from 'next/headers';
import OpenAI from 'openai';

import { toChatAttachmentSnapshot } from '@/lib/chat-attachments';
import { parseGenerateImageRequestBody } from '@/lib/chat-dtos';
import {
  appendSessionMessage,
  CHAT_SESSION_COOKIE_NAME,
  getSessionContextAttachments,
} from '@/lib/chat-session-store';
import { toResponseInputContentFromAttachments } from '@/lib/openai-response-input-content';

import type { ChatImageAspectRatio } from '@/lib/chat-session-store';

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

function getSessionId(cookieStore: Awaited<ReturnType<typeof cookies>>): string {
  const existingSessionId = cookieStore.get(CHAT_SESSION_COOKIE_NAME)?.value;

  if (existingSessionId) {
    return existingSessionId;
  }

  const nextSessionId = crypto.randomUUID();
  cookieStore.set(CHAT_SESSION_COOKIE_NAME, nextSessionId, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return nextSessionId;
}

function getProviderErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unable to generate image right now.';
}

function isInvalidFileProviderError(error: unknown): boolean {
  const message = getProviderErrorMessage(error).toLowerCase();
  return (
    message.includes('invalid file') ||
    message.includes('expected context stuffing file type') ||
    (message.includes('invalid input') && message.includes('input_file'))
  );
}

function getGeneratedImageBase64(response: OpenAI.Responses.Response): string | null {
  for (const item of response.output) {
    if (item.type !== 'image_generation_call') {
      continue;
    }

    if (typeof item.result === 'string' && item.result) {
      return item.result;
    }
  }

  return null;
}

function toNdjsonLine(payload: Record<string, number | string>): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(payload)}\n`);
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: 'OPENAI_API_KEY is missing.' }, { status: 500 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsedBody = parseGenerateImageRequestBody(body);

  if (!parsedBody.ok) {
    return Response.json({ error: parsedBody.error }, { status: 400 });
  }

  const { aspectRatio, prompt } = parsedBody.data;
  const cookieStore = await cookies();
  const sessionId = getSessionId(cookieStore);
  const activeAttachments = getSessionContextAttachments(sessionId);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const imageModel = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
  const size = getImageSizeFromAspectRatio(aspectRatio);

  appendSessionMessage(sessionId, {
    content: {
      attachments: activeAttachments.map((attachment) => toChatAttachmentSnapshot(attachment)),
      text: prompt,
      type: 'text',
    },
    role: 'user',
  });

  try {
    const stream = await openai.responses.create({
      input: [
        {
          content: [
            { text: prompt, type: 'input_text' },
            ...toResponseInputContentFromAttachments(activeAttachments),
          ],
          role: 'user',
          type: 'message',
        },
      ],
      model,
      tools: [
        (() => {
          const imageTool = {
            ['output_format']: 'png' as const,
            ['partial_images']: 2,
            model: imageModel,
            size,
            type: 'image_generation' as const,
          };
          return imageTool;
        })(),
      ],
      stream: true,
    });
    const readableStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let finalResponse: OpenAI.Responses.Response | null = null;
        let finalImageBase64: string | null = null;

        try {
          for await (const event of stream) {
            if (event.type === 'response.image_generation_call.partial_image') {
              controller.enqueue(
                toNdjsonLine({
                  aspectRatio,
                  imageBase64: event.partial_image_b64,
                  mimeType: 'image/png',
                  partialImageIndex: event.partial_image_index,
                  prompt,
                  type: 'partial_image',
                })
              );
              continue;
            }

            if (event.type === 'response.output_item.done') {
              if (
                event.item.type === 'image_generation_call' &&
                typeof event.item.result === 'string'
              ) {
                finalImageBase64 = event.item.result;
              }

              continue;
            }

            if (event.type === 'response.completed') {
              finalResponse = event.response;
            }
          }

          if (!finalResponse) {
            controller.enqueue(
              toNdjsonLine({
                message: 'Image generation ended without a final response.',
                type: 'error',
              })
            );
            return;
          }

          const imageBase64 = finalImageBase64 ?? getGeneratedImageBase64(finalResponse);

          if (!imageBase64) {
            controller.enqueue(
              toNdjsonLine({
                message: 'Image generation did not return image data.',
                type: 'error',
              })
            );
            return;
          }

          appendSessionMessage(sessionId, {
            content: {
              aspectRatio,
              imageBase64,
              mimeType: 'image/png',
              prompt,
              type: 'image',
            },
            role: 'assistant',
          });

          controller.enqueue(
            toNdjsonLine({
              aspectRatio,
              imageBase64,
              mimeType: 'image/png',
              prompt,
              type: 'complete',
            })
          );
        } catch (error) {
          const message = isInvalidFileProviderError(error)
            ? 'Uno de los adjuntos de imagen fue enviado con un formato no compatible para este request. Reintenta; si persiste, quita ese adjunto.'
            : `No fue posible generar la imagen: ${getProviderErrorMessage(error)}`;

          controller.enqueue(
            toNdjsonLine({
              message,
              type: 'error',
            })
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'cache-control': 'no-store',
        'content-type': 'application/x-ndjson; charset=utf-8',
      },
    });
  } catch (error) {
    if (isInvalidFileProviderError(error)) {
      return Response.json(
        {
          error:
            'Uno de los adjuntos de imagen fue enviado con un formato no compatible para este request. Reintenta; si persiste, quita ese adjunto.',
        },
        { status: 400 }
      );
    }

    return Response.json(
      { error: `No fue posible generar la imagen: ${getProviderErrorMessage(error)}` },
      { status: 502 }
    );
  }
}
