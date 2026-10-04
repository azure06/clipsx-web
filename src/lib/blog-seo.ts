import { siteConfig } from '@/config/site';
import type { BlogPost } from '@/content/blog';
import { pick } from '@/content/marketing';
import type { Locale } from '@/i18n/config';
import { localizedUrl, pageMetadata } from './seo';

export function articleMetadata(post: BlogPost, locale: Locale) {
  const metadata = pageMetadata(locale, `/blog/${post.slug}`, pick(post.title, locale), pick(post.description, locale));
  const image = { url: new URL(post.image.src, siteConfig.url).href, width: post.image.width, height: post.image.height, alt: pick(post.image.alt, locale) };
  return {
    ...metadata,
    openGraph: { ...metadata.openGraph, type: 'article' as const, publishedTime: post.date,
      ...(post.modifiedDate ? { modifiedTime: post.modifiedDate } : {}), authors: ['ClipsX'], images: [image] },
    twitter: { ...metadata.twitter, images: [{ url: image.url, alt: image.alt }] },
  };
}

export function articleSchema(post: BlogPost, locale: Locale) {
  return {
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: pick(post.title, locale), description: pick(post.description, locale),
    datePublished: post.date, ...(post.modifiedDate ? { dateModified: post.modifiedDate } : {}),
    inLanguage: locale, mainEntityOfPage: localizedUrl(locale, `/blog/${post.slug}`),
    author: { '@type': 'Organization', name: 'ClipsX', url: siteConfig.url },
    publisher: { '@type': 'Organization', name: 'ClipsX', url: siteConfig.url },
    image: new URL(post.image.src, siteConfig.url).href,
  };
}
