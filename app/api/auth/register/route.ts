import { cookies } from 'next/headers';

import { applySetCookies, getAuthClient, PROJECT_SLUG, toErrorResponse } from '@/lib/auth';

import type { ProjectAuthRegisterRequest } from '@cesco_valle/identity-contracts/user';

export async function POST(request: Request): Promise<Response> {
  let body: ProjectAuthRegisterRequest;

  try {
    body = (await request.json()) as ProjectAuthRegisterRequest;
  } catch {
    return Response.json(
      { error: { code: 'BAD_REQUEST', message: 'Invalid JSON body.' } },
      { status: 400 }
    );
  }

  const cookie = (await cookies()).toString();

  try {
    const result = await getAuthClient().register(PROJECT_SLUG, body, { cookie });
    const response = Response.json(result.data, { status: 201 });
    applySetCookies(response, result.setCookie);
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
