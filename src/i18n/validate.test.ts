import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NEXT_HTTP_ERROR_FALLBACK;404'); },
}));

import { assertLocale } from './validate';

describe('route locale validation', () => {
  it.each(['en', 'ja'])('accepts %s', locale => {
    expect(() => assertLocale(locale)).not.toThrow();
  });
  it.each(['favicon.ico', 'logo.svg', 'clips.svg', 'fr', 'EN', '', '__proto__'])('rejects %s', locale => {
    expect(() => assertLocale(locale)).toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
  });
});
