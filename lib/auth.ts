import 'server-only';

import { ApiError, createUserAuthClient } from '@cesco_valle/identity-auth-sdk/user';
import { cookies } from 'next/headers';

import type { UserAuthClient } from '@cesco_valle/identity-auth-sdk/user';
import type { ProjectAuthResponse } from '@cesco_valle/identity-contracts/user';

/** other-gpt maps to this project slug in identity-service. */
export const PROJECT_SLUG = 'other-gpt';

let client: UserAuthClient | undefined;

/**
 * Lazily build (and memoize) the user auth client. Reads `IDENTITY_URL` at call
 * time so a missing var fails per-request, not at module load / build time.
 */
export function getAuthClient(): UserAuthClient {
  if (!client) {
    const baseUrl = process.env.IDENTITY_URL;
    if (!baseUrl) {
      throw new Error('IDENTITY_URL is not configured');
    }
    client = createUserAuthClient({ baseUrl });
  }
  return client;
}

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
  const cookie = (await cookies()).toString();
  try {
    return await getAuthClient().getMe(PROJECT_SLUG, { cookie });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}
