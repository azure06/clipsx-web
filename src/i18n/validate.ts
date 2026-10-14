import { notFound } from 'next/navigation';
import { locales, type Locale } from './config';

/** Route parameters are untrusted, even when their TypeScript type is narrower. */
export function assertLocale(value: string): asserts value is Locale {
  if (!locales.some(locale => locale === value)) notFound();
}
