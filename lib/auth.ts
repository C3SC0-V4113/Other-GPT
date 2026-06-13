import 'server-only';

import { ApiError } from '@cesco_valle/identity-auth-sdk/user';
import { cookies } from 'next/headers';

import { PROJECT_SLUG, SESSION_COOKIE_NAME } from './auth-shared';
import { getAuthClient } from './identity-client';

import type { ProjectAuthResponse } from '@cesco_valle/identity-contracts/user';

export { PROJECT_SLUG } from './auth-shared';
export { getAuthClient } from './identity-client';

/**
 * Relay the raw `Set-Cookie` values from identity-service onto a same-origin
 * response so the browser stores the session cookie on other-gpt's origin (BFF).
 */
export function applySetCookies(response: Response, setCookie: string[]): void {
  for (const cookie of setCookie) {
    response.headers.append('set-cookie', cookie);
  }
}

/**
 * Map an SDK `ApiError` to a same-shaped JSON error response for the browser;
 * anything else becomes a 502 (identity-service unreachable / unexpected).
 */
export function toErrorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status }
    );
  }
  return Response.json(
    { error: { code: 'IDENTITY_UNREACHABLE', message: 'Could not reach identity-service.' } },
    { status: 502 }
  );
}

/**
 * Authoritative current-user read for Server Components. Forwards the incoming
 * session cookie and returns `null` when the session is missing/invalid (401).
 */
export async function getCurrentUser(): Promise<ProjectAuthResponse | null> {
  const cookieStore = await cookies();
  if (!cookieStore.has(SESSION_COOKIE_NAME)) {
    return null;
  }

  const cookie = cookieStore.toString();
  try {
    return await getAuthClient().getMe(PROJECT_SLUG, { cookie });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

/**
 * Guard for data Route Handlers: returns a `401` response when there is no valid
 * session, or `null` to proceed. Uses the lightweight `hasValidSession` check and
 * fails closed if identity-service is unreachable.
 */
export async function requireSession(): Promise<Response | null> {
  const cookieStore = await cookies();
  if (!cookieStore.has(SESSION_COOKIE_NAME)) {
    return Response.json(
      { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in required.' } },
      { status: 401 }
    );
  }

  const cookie = cookieStore.toString();
  let isValid = false;
  try {
    isValid = await getAuthClient().hasValidSession(PROJECT_SLUG, { cookie });
  } catch {
    isValid = false;
  }
  if (!isValid) {
    return Response.json(
      { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in required.' } },
      { status: 401 }
    );
  }
  return null;
}
