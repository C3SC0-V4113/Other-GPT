import { cookies } from 'next/headers';

import { applySetCookies, getAuthClient, PROJECT_SLUG, toErrorResponse } from '@/lib/auth';

export async function POST(): Promise<Response> {
  const cookie = (await cookies()).toString();

  try {
    const result = await getAuthClient().logout(PROJECT_SLUG, { cookie });
    // 204 carries no body but still relays the cookie-clearing Set-Cookie.
    const response = new Response(null, { status: 204 });
    applySetCookies(response, result.setCookie);
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
