import OpenAI from 'openai';

export async function POST(request: Request): Promise<Response> {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: 'OPENAI_API_KEY is missing.' }, { status: 500 });
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Invalid form data body.' }, { status: 400 });
  }

  const audio = formData.get('audio');

  if (!(audio instanceof File)) {
    return Response.json({ error: 'Audio file is required.' }, { status: 400 });
  }

  if (audio.size === 0) {
    return Response.json({ error: 'Audio file is empty.' }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe';

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: audio,
      model,
    });

    return Response.json({ text: transcription.text ?? '' });
  } catch {
    return Response.json({ error: 'Unable to transcribe audio right now.' }, { status: 502 });
  }
}
