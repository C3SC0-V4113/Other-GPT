import { cookies } from 'next/headers';
import OpenAI from 'openai';

import { getUserLocale } from '@/i18n/locale';
import { getCurrentUser, requireSession } from '@/lib/auth';
import { toChatAttachmentSnapshot } from '@/lib/chat-attachments';
import { parseChatRequestBody } from '@/lib/chat-dtos';
import { buildChatInstructions } from '@/lib/chat-instructions';
import {
  appendSessionMessage,
  CHAT_SESSION_COOKIE_NAME,
  clearSessionData,
  getSessionContextAttachments,
  getSessionMessages,
} from '@/lib/chat-session-store';
import { buildMiradorMcpTools } from '@/lib/mirador-tools';
import { toResponseInputContentFromAttachments } from '@/lib/openai-response-input-content';

import type { ChatAttachment } from '@/lib/chat-attachments';

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

// TEMP diagnostic: set MIRADOR_MCP_DEBUG=1 to log the raw MCP tool-call result
// (output + error) that OpenAI received. Reveals whether Mirador returned data or
// an error when the model says it had a "technical problem". Remove once resolved.
function logMiradorDiagnostics(event: OpenAI.Responses.ResponseStreamEvent): void {
  if (process.env.MIRADOR_MCP_DEBUG !== '1' || event.type !== 'response.output_item.done') {
    return;
  }

  const { item } = event;
  if (item.type === 'mcp_call') {
    console.error(
      '[mirador-mcp] mcp_call',
      JSON.stringify({
        arguments: item.arguments,
        error: item.error,
        name: item.name,
        output: item.output,
        status: item.status,
      })
    );
  } else if (item.type === 'mcp_list_tools') {
    console.error(
      '[mirador-mcp] mcp_list_tools',
      JSON.stringify({ error: item.error, toolCount: item.tools.length })
    );
  }
}

function getProviderErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unable to complete the request right now.';
}

function isInvalidFileProviderError(error: unknown): boolean {
  const message = getProviderErrorMessage(error).toLowerCase();
  return (
    message.includes('invalid file') ||
    message.includes('expected context stuffing file type') ||
    (message.includes('invalid input') && message.includes('input_file'))
  );
}

function buildInputFromSessionMessages(
  sessionMessages: ReturnType<typeof getSessionMessages>,
  currentMessage: string,
  currentAttachments: ChatAttachment[]
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
          ...toResponseInputContentFromAttachments(currentAttachments),
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
  const unauthorized = await requireSession();
  if (unauthorized) {
    return unauthorized;
  }

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
  // Single identity read covers both the auth guard and the role check used to
  // gate Mirador MCP tools below (mirrors `app/api/realtime/session/route.ts`).
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }
  if (!user) {
    return Response.json(
      { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in required.' } },
      { status: 401 }
    );
  }

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

  const activeAttachments = getSessionContextAttachments(sessionId);

  appendSessionMessage(sessionId, {
    content: {
      attachments: activeAttachments.map((attachment) => toChatAttachmentSnapshot(attachment)),
      text: userMessage,
      type: 'text',
    },
    role: 'user',
  });

  const sessionMessages = getSessionMessages(sessionId);
  const modelInput = buildInputFromSessionMessages(sessionMessages, userMessage, activeAttachments);
  const locale = await getUserLocale();

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  // Elevated roles (`pro` / `admin`) get Mirador Core company-data tools; basic
  // users get an empty array, leaving the request unchanged.
  const miradorTools = buildMiradorMcpTools(user);
  let stream: Awaited<ReturnType<typeof openai.responses.create>>;

  try {
    stream = await openai.responses.create({
      input: modelInput,
      instructions: buildChatInstructions(locale, { miradorEnabled: miradorTools.length > 0 }),
      model,
      stream: true,
      ...(miradorTools.length > 0 ? { tools: miradorTools } : {}),
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
      { error: `No fue posible procesar el mensaje: ${getProviderErrorMessage(error)}` },
      { status: 502 }
    );
  }

  const encoder = new TextEncoder();
  let assistantMessage = '';

  const readableStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          logMiradorDiagnostics(event);

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
