import OpenAI from 'openai';

import { requireSession } from '@/lib/auth';
import { parseSpeechRequestBody } from '@/lib/chat-dtos';

export async function POST(request: Request): Promise<Response> {
  const unauthorized = await requireSession();
  if (unauthorized) {
    return unauthorized;
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

  const parsedBody = parseSpeechRequestBody(body);

  if (!parsedBody.ok) {
    return Response.json({ error: parsedBody.error }, { status: 400 });
  }

  const { text } = parsedBody.data;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
  const voice = process.env.OPENAI_TTS_VOICE || 'alloy';

  try {
    const speechRequest: Parameters<typeof openai.audio.speech.create>[0] = {
      input: text,
      model,
      voice,
    };
    speechRequest['response_format'] = 'mp3';
    const speechResponse = await openai.audio.speech.create(speechRequest);
    const arrayBuffer = await speechResponse.arrayBuffer();

    return new Response(arrayBuffer, {
      headers: {
        'cache-control': 'no-store',
        'content-type': 'audio/mpeg',
      },
    });
  } catch {
    return Response.json({ error: 'Unable to generate speech right now.' }, { status: 502 });
  }
}
