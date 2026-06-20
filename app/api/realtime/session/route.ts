import { getUserLocale } from '@/i18n/locale';
import { getCurrentUser } from '@/lib/auth';
import { buildChatInstructions } from '@/lib/chat-instructions';
import { canUseRealtimeVoice } from '@/lib/roles';

const OPENAI_CLIENT_SECRETS_URL = 'https://api.openai.com/v1/realtime/client_secrets';

/**
 * Mints a short-lived ephemeral client secret for the browser to open a WebRTC
 * connection to the OpenAI Realtime API. The standard `OPENAI_API_KEY` never
 * leaves the server (BFF pattern); the browser only receives the ephemeral
 * value. Realtime voice is reserved for elevated roles (`pro` / `admin`).
 */
export async function POST(): Promise<Response> {
  // Role guard first (fail closed), mirroring `app/api/images/route.ts`.
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
  if (!canUseRealtimeVoice(user)) {
    return Response.json(
      {
        error: {
          code: 'REALTIME_VOICE_FORBIDDEN',
          message: 'Realtime voice requires an upgraded role.',
        },
      },
      { status: 403 }
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: 'OPENAI_API_KEY is missing.' }, { status: 500 });
  }

  const model = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime';
  const voice = process.env.OPENAI_REALTIME_VOICE || 'alloy';
  const transcriptionModel = process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe';
  const locale = await getUserLocale();

  try {
    const response = await fetch(OPENAI_CLIENT_SECRETS_URL, {
      body: JSON.stringify({
        session: {
          audio: {
            input: { transcription: { model: transcriptionModel } },
            output: { voice },
          },
          instructions: buildChatInstructions(locale),
          model,
          type: 'realtime',
        },
      }),
      headers: {
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'content-type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok) {
      return Response.json(
        { error: 'Unable to start a realtime voice session right now.' },
        { status: 502 }
      );
    }

    const payload = (await response.json()) as { value?: unknown };

    if (typeof payload.value !== 'string' || !payload.value) {
      return Response.json(
        { error: 'Realtime voice session did not return a client secret.' },
        { status: 502 }
      );
    }

    return Response.json({ model, value: payload.value });
  } catch {
    return Response.json(
      { error: 'Unable to start a realtime voice session right now.' },
      { status: 502 }
    );
  }
}
