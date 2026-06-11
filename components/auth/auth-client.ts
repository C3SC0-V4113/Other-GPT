/** Localized `auth.errors.*` message keys (mirrors messages/*.json → auth.errors). */
export type AuthErrorKey =
  | 'emailRequired'
  | 'emailInvalid'
  | 'passwordRequired'
  | 'passwordTooShort'
  | 'invalidCredentials'
  | 'userBanned'
  | 'membershipBlocked'
  | 'projectDisabled'
  | 'emailExists'
  | 'unreachable'
  | 'generic';

/** identity-service error codes mapped to localized `auth.errors.*` keys. */
const ERROR_CODE_TO_KEY = new Map<string, AuthErrorKey>([
  ['INVALID_CREDENTIALS', 'invalidCredentials'],
  ['USER_BANNED', 'userBanned'],
  ['PROJECT_MEMBERSHIP_SUSPENDED', 'membershipBlocked'],
  ['PROJECT_MEMBERSHIP_REVOKED', 'membershipBlocked'],
  ['PROJECT_DISABLED', 'projectDisabled'],
  ['EMAIL_ALREADY_EXISTS', 'emailExists'],
  ['IDENTITY_UNREACHABLE', 'unreachable'],
]);

export async function postJson(path: string, body: unknown): Promise<Response> {
  return fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Read the BFF error body and map its code to a localized message key. */
export async function readServerErrorKey(response: Response): Promise<AuthErrorKey> {
  const payload = (await response.json().catch(() => null)) as {
    error?: { code?: string };
  } | null;
  const code = payload?.error?.code;
  return (code ? ERROR_CODE_TO_KEY.get(code) : undefined) ?? 'generic';
}
