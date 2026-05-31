/* eslint-disable @typescript-eslint/naming-convention -- `Locale` and `Messages` are the exact property names required by next-intl's AppConfig augmentation. */
import type { Locale } from './i18n/config';
import type messages from './messages/en.json';

declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
