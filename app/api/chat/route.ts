import { cookies } from 'next/headers';
import OpenAI from 'openai';

import { parseChatRequestBody } from '@/lib/chat-dtos';
import {
  appendSessionMessage,
  CHAT_SESSION_COOKIE_NAME,
  clearSessionMessages,
  getSessionMessages,
} from '@/lib/chat-session-store';

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

function getAssistantMessageText(chunk: OpenAI.ChatCompletionChunk): string {
  return chunk.choices[0]?.delta?.content ?? '';
}

export async function DELETE(): Promise<Response> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(CHAT_SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    clearSessionMessages(sessionId);
  }

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

  appendSessionMessage(sessionId, { content: { text: userMessage, type: 'text' }, role: 'user' });

  const sessionMessages = getSessionMessages(sessionId);
  const modelMessages: ChatCompletionMessageParam[] = sessionMessages.reduce<
    ChatCompletionMessageParam[]
  >((accumulator, message) => {
    if (message.content.type !== 'text') {
      return accumulator;
    }

    accumulator.push({
      content: message.content.text,
      role: message.role,
    });

    return accumulator;
  }, []);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

  const stream = await openai.chat.completions.create({
    messages: modelMessages,
    model,
    stream: true,
  });

  const encoder = new TextEncoder();
  let assistantMessage = '';

  const readableStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = getAssistantMessageText(chunk);

          if (!delta) {
            continue;
          }

          assistantMessage += delta;
          controller.enqueue(encoder.encode(delta));
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
