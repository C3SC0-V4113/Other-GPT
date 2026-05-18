import { cookies } from 'next/headers';
import OpenAI from 'openai';

import { CHAT_SESSION_COOKIE_NAME, removeSessionAttachment } from '@/lib/chat-session-store';

interface AttachmentRouteContext {
  params: Promise<{ attachmentId: string }>;
}

export async function DELETE(
  request: Request,
  { params }: AttachmentRouteContext
): Promise<Response> {
  void request;
  const { attachmentId } = await params;

  if (!attachmentId) {
    return Response.json({ error: 'Attachment id is required.' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(CHAT_SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    return Response.json({ error: 'Session not found.' }, { status: 404 });
  }

  const removedAttachment = removeSessionAttachment(sessionId, attachmentId);

  if (!removedAttachment) {
    return Response.json({ error: 'Attachment not found.' }, { status: 404 });
  }

  if (process.env.OPENAI_API_KEY) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    try {
      await openai.files.delete(removedAttachment.fileId);
    } catch {
      // Attachment is already removed from the session. Ignore remote cleanup failures.
    }
  }

  return new Response(null, { status: 204 });
}
