import { getAuthClient, PROJECT_SLUG, toErrorResponse } from '@/lib/auth';

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { code: 'BAD_REQUEST', message: 'Invalid JSON body.' } },
      { status: 400 }
    );
  }

  const email = (body as { email?: unknown }).email;

  if (typeof email !== 'string') {
    return Response.json(
      { error: { code: 'BAD_REQUEST', message: 'email is required.' } },
      { status: 400 }
    );
  }

  try {
    const result = await getAuthClient().checkEmail(PROJECT_SLUG, email);
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
