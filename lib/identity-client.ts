import { createUserAuthClient } from '@cesco_valle/identity-auth-sdk/user';

import { PROJECT_SLUG } from './auth-shared';

import type { UserAuthClient } from '@cesco_valle/identity-auth-sdk/user';

// No `server-only`: this module is also imported by the proxy (Node runtime) to
// verify sessions on navigation. The user client carries no secrets.

let client: UserAuthClient | undefined;

const IDENTITY_REQUEST_TIMEOUT_MS = 5_000;

/**
 * identity-service is on the critical render path for auth checks. Keep those
 * requests bounded so a stuck TCP connection cannot leave a route compiling or
 * rendering forever in dev/prod.
 */
export function fetchWithIdentityTimeout(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return fetch(input, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(IDENTITY_REQUEST_TIMEOUT_MS),
  });
}

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
    client = createUserAuthClient({ baseUrl, fetch: fetchWithIdentityTimeout });
  }
  return client;
}

/**
 * Authoritative session check for the proxy gate: validates the forwarded cookie
 * against identity-service (`GET /auth/session` → 204/401). Fails closed so a
 * revoked/expired session — or an unreachable backend — is treated as invalid.
 */
export async function isSessionValid(cookie: string): Promise<boolean> {
  try {
    return await getAuthClient().hasValidSession(PROJECT_SLUG, { cookie });
  } catch {
    return false;
  }
}
