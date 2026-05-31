import { describe, expect, it } from 'vitest';

import en from '@/messages/en.json';
import es from '@/messages/es.json';

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') {
    return [prefix];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) =>
    flattenKeys(nested, prefix ? `${prefix}.${key}` : key)
  );
}

describe('i18n message dictionaries', () => {
  it('keeps the same set of keys across every locale', () => {
    const enKeys = flattenKeys(en).sort();
    const esKeys = flattenKeys(es).sort();

    expect(esKeys).toEqual(enKeys);
  });

  it('has no empty translations', () => {
    for (const dictionary of [en, es]) {
      for (const key of flattenKeys(dictionary)) {
        const value = key
          .split('.')
          .reduce<unknown>((acc, segment) => (acc as Record<string, unknown>)[segment], dictionary);

        expect(typeof value === 'string' && value.trim().length > 0).toBe(true);
      }
    }
  });
});
