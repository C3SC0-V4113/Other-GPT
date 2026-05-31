import { getRequestConfig } from 'next-intl/server';

import { getUserLocale } from './locale';
import en from '../messages/en.json';
import es from '../messages/es.json';

import type { Locale } from './config';

const messagesByLocale = { en, es } satisfies Record<Locale, unknown>;

export default getRequestConfig(async () => {
  const locale = await getUserLocale();

  return {
    locale,
    messages: messagesByLocale[locale],
  };
});
