import 'server-only';

import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';
import { cookies, headers } from 'next/headers';

import { defaultLocale, isLocale, LOCALE_COOKIE_NAME, locales, type Locale } from './config';

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/**
 * Resolves the active locale for the current request.
 *
 * Resolution order:
 * 1. The `NEXT_LOCALE` cookie (the user's explicit choice).
 * 2. The system preference negotiated from the `Accept-Language` header.
 * 3. The default locale.
 */
export async function getUserLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  if (cookieLocale && isLocale(cookieLocale)) {
    return cookieLocale;
  }

  return negotiateLocaleFromHeaders();
}

/**
 * Persists the user's explicit locale choice in a long-lived cookie.
 * Used as a server action from the language selector.
 */
export async function setUserLocale(locale: Locale): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE_NAME, locale, {
    maxAge: ONE_YEAR_IN_SECONDS,
    path: '/',
    sameSite: 'lax',
  });
}

async function negotiateLocaleFromHeaders(): Promise<Locale> {
  const headerStore = await headers();
  const acceptLanguage = headerStore.get('accept-language');

  if (!acceptLanguage) {
    return defaultLocale;
  }

  const languages = new Negotiator({
    headers: { 'accept-language': acceptLanguage },
  }).languages();

  try {
    return match(languages, locales as readonly string[], defaultLocale) as Locale;
  } catch {
    return defaultLocale;
  }
}
