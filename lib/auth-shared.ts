/**
 * Auth constants safe to import anywhere (no `server-only`), so the edge/proxy
 * gate can read them without pulling in the server SDK.
 */

/** other-gpt maps to this project slug in identity-service. */
export const PROJECT_SLUG = 'other-gpt';

/**
 * Name of the session cookie issued by identity-service and relayed same-origin
 * by the BFF. Must match identity-service `SESSION_COOKIE_NAME` (its default).
 */
export const SESSION_COOKIE_NAME = 'identity_service_session';
