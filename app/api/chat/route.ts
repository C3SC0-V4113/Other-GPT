import { cookies } from 'next/headers';
import OpenAI from 'openai';

import { toChatAttachmentSnapshot } from '@/lib/chat-attachments';
import { parseChatRequestBody } from '@/lib/chat-dtos';
import {
  appendSessionMessage,
  CHAT_SESSION_COOKIE_NAME,
  clearSessionData,
  getSessionAttachments,
  getSessionMessages,
} from '@/lib/chat-session-store';

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
        // The session is already cleared locally; best effort remote cleanup.
      }
    })
  );
}

function buildInputFromSessionMessages(
  sessionMessages: ReturnType<typeof getSessionMessages>,
  currentMessage: string,
  currentFileIds: string[]
) {
  return sessionMessages.reduce<OpenAI.Responses.ResponseInputItem[]>(
    (accumulator, message, index) => {
      if (message.content.type !== 'text') {
        return accumulator;
      }

      const isCurrentUserMessage =
        index === sessionMessages.length - 1 &&
        message.role === 'user' &&
        message.content.text === currentMessage;

      if (!isCurrentUserMessage) {
        accumulator.push({
          content: message.content.text,
          role: message.role,
          type: 'message',
        });
        return accumulator;
      }

      accumulator.push({
        content: [
          {
            text: message.content.text,
            type: 'input_text',
          },
          ...currentFileIds.map((fileId) => {
            const fileInput: { [key: string]: string } & { type: 'input_file' } = {
              type: 'input_file',
            };
            fileInput['file_id'] = fileId;
            return fileInput;
          }),
        ],
        role: 'user',
        type: 'message',
      });

      return accumulator;
    },
    []
  );
}

export async function DELETE(): Promise<Response> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(CHAT_SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    return new Response(null, { status: 204 });
  }

  const { fileIdsToDelete } = clearSessionData(sessionId);
  await deleteFilesFromOpenAI(fileIdsToDelete);

  return new Response(null, { status: 204 });
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

  const parsedBody = parseChatRequestBody(body);

  if (!parsedBody.ok) {
    return Response.json({ error: parsedBody.error }, { status: 400 });
  }

  const userMessage = parsedBody.data.message;

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

  const activeAttachments = getSessionAttachments(sessionId);

  appendSessionMessage(sessionId, {
    content: {
      attachments: activeAttachments.map((attachment) => toChatAttachmentSnapshot(attachment)),
      text: userMessage,
      type: 'text',
    },
    role: 'user',
  });

  const sessionMessages = getSessionMessages(sessionId);
  const modelInput = buildInputFromSessionMessages(
    sessionMessages,
    userMessage,
    activeAttachments.map((attachment) => attachment.fileId)
  );

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

  const stream = await openai.responses.create({
    input: modelInput,
    instructions:
      'When using information from attached files, explicitly cite file names in square brackets, for example: [spec.pdf].',
    model,
    stream: true,
  });

  const encoder = new TextEncoder();
  let assistantMessage = '';

  const readableStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type !== 'response.output_text.delta' || !event.delta) {
            continue;
          }

          assistantMessage += event.delta;
          controller.enqueue(encoder.encode(event.delta));
        }

        if (assistantMessage) {
          appendSessionMessage(sessionId, {
            content: { text: assistantMessage, type: 'text' },
            role: 'assistant',
          });
        }
      } catch {
        if (!controller.desiredSize || controller.desiredSize > 0) {
          controller.enqueue(
            encoder.encode('\n\n[Error: The assistant response was interrupted. Please try again.]')
          );
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      'cache-control': 'no-store',
      'content-type': 'text/plain; charset=utf-8',
    },
  });
}
