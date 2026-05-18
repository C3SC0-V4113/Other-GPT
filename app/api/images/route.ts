import { cookies } from 'next/headers';
import OpenAI from 'openai';

import {
  isKnownInferenceIncompatibleAttachment,
  toChatAttachmentSnapshot,
} from '@/lib/chat-attachments';
import { parseGenerateImageRequestBody } from '@/lib/chat-dtos';
import {
  appendSessionMessage,
  CHAT_SESSION_COOKIE_NAME,
  getSessionAttachments,
  removeSessionAttachmentsByIds,
} from '@/lib/chat-session-store';

import type { ChatAttachment } from '@/lib/chat-attachments';
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
  return message.includes('invalid file');
}

async function deleteFilesFromOpenAI(fileIds: string[]): Promise<void> {
  if (!fileIds.length || !process.env.OPENAI_API_KEY) {
    return;
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  await Promise.all(
    fileIds.map(async (fileId) => {
      try {
        await openai.files.delete(fileId);
      } catch {
        // Best effort cleanup.
      }
    })
  );
}

async function removeKnownIncompatibleAttachmentsFromSession(
  sessionId: string,
  attachments: ChatAttachment[]
): Promise<number> {
  const incompatibleAttachmentIds = attachments.reduce<string[]>((accumulator, attachment) => {
    if (
      isKnownInferenceIncompatibleAttachment({
        filename: attachment.name,
        mimeType: attachment.mimeType,
      })
    ) {
      accumulator.push(attachment.id);
    }

    return accumulator;
  }, []);

  const removedAttachments = removeSessionAttachmentsByIds(sessionId, incompatibleAttachmentIds);

  if (!removedAttachments.length) {
    return 0;
  }

  await deleteFilesFromOpenAI(removedAttachments.map((attachment) => attachment.fileId));
  return removedAttachments.length;
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
  const activeAttachments = getSessionAttachments(sessionId);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const imageModel = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
  const size = getImageSizeFromAspectRatio(aspectRatio);

  try {
    const response = await openai.responses.create({
      input: [
        {
          content: [
            { text: prompt, type: 'input_text' },
            ...activeAttachments.map((attachment) => {
              const fileInput: { [key: string]: string } & { type: 'input_file' } = {
                type: 'input_file',
              };
              fileInput['file_id'] = attachment.fileId;
              return fileInput;
            }),
          ],
          role: 'user',
          type: 'message',
        },
      ],
      model,
      tools: [
        (() => {
          const imageTool: {
            model: string;
            size: '1024x1024' | '1024x1536' | '1536x1024' | 'auto';
            type: 'image_generation';
            [key: string]: string;
          } = {
            model: imageModel,
            size,
            type: 'image_generation',
          };
          imageTool['output_format'] = 'png';
          return imageTool;
        })(),
      ],
    });

    const imageBase64 = getGeneratedImageBase64(response);

    if (!imageBase64) {
      return Response.json(
        { error: 'Image generation did not return image data.' },
        { status: 502 }
      );
    }

    appendSessionMessage(sessionId, {
      content: {
        attachments: activeAttachments.map((attachment) => toChatAttachmentSnapshot(attachment)),
        text: prompt,
        type: 'text',
      },
      role: 'user',
    });
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

    return Response.json({
      aspectRatio,
      imageBase64,
      mimeType: 'image/png',
      prompt,
    });
  } catch (error) {
    if (isInvalidFileProviderError(error)) {
      const removedCount = await removeKnownIncompatibleAttachmentsFromSession(
        sessionId,
        activeAttachments
      );

      if (removedCount > 0) {
        return Response.json(
          {
            error: 'Se removio un adjunto incompatible (por ejemplo SVG). Reintenta la generacion.',
          },
          { status: 400 }
        );
      }

      return Response.json(
        {
          error:
            'Uno de los adjuntos fue rechazado por el proveedor de IA. Quitalo manualmente y reintenta.',
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
