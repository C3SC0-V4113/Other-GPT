'use server';

import { isLocale } from './config';
import { setUserLocale } from './locale';

/**
 * Server action invoked by the language selector to persist the user's
 * locale choice. Validates the incoming value since this is a public endpoint.
 */
// eslint-disable-next-line react-doctor/server-auth-actions -- This action only writes a validated, non-sensitive UI locale cookie; the app has no auth context or per-user data to guard.
export async function changeLocaleAction(locale: string): Promise<void> {
  if (!isLocale(locale)) {
    return;
  }

  await setUserLocale(locale);
}
