import { getCurrentUser } from '@/lib/auth';
import { getEmailClient } from '@/lib/email';
import { isBasicUser } from '@/lib/roles';

function missingConfigError(...vars: string[]): Response {
  return Response.json(
    {
      error: {
        code: 'SERVICE_MISCONFIGURED',
        message: `Missing required configuration: ${vars.join(', ')}.`,
      },
    },
    { status: 503 }
  );
}

function parseMessage(body: unknown): { message: string } | null {
  if (body === null || typeof body !== 'object') {
    return null;
  }
  if (!('message' in body)) {
    return { message: '' };
  }
  const raw = (body as Record<string, unknown>).message;
  if (raw === undefined || raw === null) {
    return { message: '' };
  }
  if (typeof raw !== 'string') {
    return null;
  }
  if (raw.length > 2000) {
    return null;
  }
  return { message: raw };
}

export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json(
      { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in required.' } },
      { status: 401 }
    );
  }

  if (!isBasicUser(user)) {
    return Response.json(
      { error: { code: 'ALREADY_ELEVATED', message: 'You already have an upgraded role.' } },
      { status: 409 }
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.ROLE_REQUEST_FROM_EMAIL;
  const toEmail = process.env.ROLE_REQUEST_TO_EMAIL;

  if (!apiKey || !fromEmail || !toEmail) {
    const missing: string[] = [];
    if (!apiKey) missing.push('RESEND_API_KEY');
    if (!fromEmail) missing.push('ROLE_REQUEST_FROM_EMAIL');
    if (!toEmail) missing.push('ROLE_REQUEST_TO_EMAIL');
    return missingConfigError(...missing);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { code: 'BAD_REQUEST', message: 'Invalid JSON body.' } },
      { status: 400 }
    );
  }

  const parsed = parseMessage(body);
  if (parsed === null) {
    return Response.json(
      {
        error: { code: 'BAD_REQUEST', message: 'message must be a string up to 2000 characters.' },
      },
      { status: 400 }
    );
  }

  const roleNames =
    user.membership?.roles.map((role) => `${role.name} (${role.code})`).join(', ') || 'none';

  const subject = `Role upgrade request from ${user.user.email}`;

  const text = [
    `User email: ${user.user.email}`,
    `User ID: ${user.user.id}`,
    `Project: ${user.project.name} (${user.project.slug})`,
    `Current roles: ${roleNames}`,
    '',
    parsed.message ? `Justification:\n${parsed.message}` : 'No justification provided.',
  ].join('\n');

  try {
    await getEmailClient().emails.send({
      from: fromEmail,
      to: toEmail,
      subject,
      text,
    });
  } catch {
    return Response.json(
      {
        error: {
          code: 'EMAIL_SEND_FAILED',
          message: 'Could not send the role upgrade request.',
        },
      },
      { status: 502 }
    );
  }

  return Response.json({ ok: true });
}
