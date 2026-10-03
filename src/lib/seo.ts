import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';
import { locales, type Locale } from '@/i18n/config';

export const publicRoutes = [
  '', '/product', '/recall', '/meaning-search', '/extensions', '/developers',
  '/blog', '/pricing', '/download', '/faq', '/changelog', '/contact', '/privacy', '/terms',
] as const;

export function localizedUrl(locale: Locale, path: string) {
  return `${siteConfig.url.replace(/\/$/, '')}/${locale}${path}`;
}

export function languageAlternates(path: string) {
  return {
    ...Object.fromEntries(locales.map(locale => [locale, localizedUrl(locale, path)])),
    'x-default': localizedUrl('en', path),
  };
}

export function pageMetadata(locale: Locale, path: string, title: string, description: string): Metadata {
  const url = localizedUrl(locale, path);
  return {
    title, description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      type: 'website', siteName: siteConfig.name, url, title, description,
      locale: locale === 'ja' ? 'ja_JP' : 'en_US',
      alternateLocale: locale === 'ja' ? ['en_US'] : ['ja_JP'],
      images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: 'ClipsX desktop clipboard' }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [siteConfig.ogImage] },
  };
}

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
