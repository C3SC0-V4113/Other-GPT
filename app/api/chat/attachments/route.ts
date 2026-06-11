import { cookies } from 'next/headers';
import OpenAI from 'openai';

import { requireSession } from '@/lib/auth';
import {
  getChatAttachmentKind,
  isKnownInferenceIncompatibleAttachment,
  isSupportedChatAttachment,
  MAX_ATTACHMENTS_PER_SESSION,
  MAX_ATTACHMENTS_PER_UPLOAD,
  MAX_ATTACHMENT_SIZE_BYTES,
} from '@/lib/chat-attachments';
import {
  addSessionAttachments,
  CHAT_SESSION_COOKIE_NAME,
  getSessionAttachments,
} from '@/lib/chat-session-store';

import type { ChatAttachment } from '@/lib/chat-attachments';

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

function toPublicAttachment(attachment: ChatAttachment) {
  return {
    id: attachment.id,
    isIncludedInContext: attachment.isIncludedInContext,
    kind: attachment.kind,
    mimeType: attachment.mimeType,
    name: attachment.name,
    sizeBytes: attachment.sizeBytes,
    uploadedAt: attachment.uploadedAt,
  };
}

export async function POST(request: Request): Promise<Response> {
  const unauthorized = await requireSession();
  if (unauthorized) {
    return unauthorized;
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: 'OPENAI_API_KEY is missing.' }, { status: 500 });
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Invalid form data body.' }, { status: 400 });
  }

  const files = formData.getAll('files').filter((entry): entry is File => entry instanceof File);

  if (!files.length) {
    return Response.json({ error: 'At least one file is required.' }, { status: 400 });
  }

  if (files.length > MAX_ATTACHMENTS_PER_UPLOAD) {
    return Response.json(
      {
        error: `Only ${MAX_ATTACHMENTS_PER_UPLOAD} attachments are allowed per upload.`,
      },
      { status: 400 }
    );
  }

  for (const file of files) {
    if (isKnownInferenceIncompatibleAttachment({ filename: file.name, mimeType: file.type })) {
      return Response.json(
        {
          error:
            'SVG no esta soportado para contexto de IA en este momento. Usa PNG, JPG, WEBP o PDF.',
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      return Response.json(
        {
          error: `${file.name} exceeds the 20MB limit.`,
        },
        { status: 400 }
      );
    }

    if (!isSupportedChatAttachment({ filename: file.name, mimeType: file.type })) {
      return Response.json(
        {
          error: `${file.name} format is not supported.`,
        },
        { status: 400 }
      );
    }
  }

  const cookieStore = await cookies();
  const sessionId = getSessionId(cookieStore);
  const activeAttachments = getSessionAttachments(sessionId);

  if (activeAttachments.length + files.length > MAX_ATTACHMENTS_PER_SESSION) {
    return Response.json(
      {
        error: `Session limit reached: max ${MAX_ATTACHMENTS_PER_SESSION} attachments.`,
      },
      { status: 400 }
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const createdFileIds: string[] = [];

  try {
    const uploadedFiles = await Promise.all(
      files.map(async (file) => ({
        file,
        uploadedFile: await openai.files.create({
          file,
          purpose: 'user_data',
        }),
      }))
    );

    const uploadedAttachments: ChatAttachment[] = uploadedFiles.map(({ file, uploadedFile }) => {
      createdFileIds.push(uploadedFile.id);

      return {
        fileId: uploadedFile.id,
        id: crypto.randomUUID(),
        isIncludedInContext: true,
        kind: getChatAttachmentKind({ filename: file.name, mimeType: file.type }),
        mimeType: file.type || 'application/octet-stream',
        name: file.name,
        sizeBytes: file.size,
        uploadedAt: Math.floor(Date.now() / 1000),
      };
    });

    addSessionAttachments(sessionId, uploadedAttachments);

    return Response.json({
      attachments: uploadedAttachments.map((attachment) => toPublicAttachment(attachment)),
    });
  } catch {
    await Promise.all(
      createdFileIds.map(async (fileId) => {
        try {
          await openai.files.delete(fileId);
        } catch {
          // Best effort rollback.
        }
      })
    );

    return Response.json({ error: 'Unable to upload attachments right now.' }, { status: 502 });
  }
}
