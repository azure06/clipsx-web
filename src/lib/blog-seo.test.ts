import { describe, expect, it } from 'vitest';
import { blogPosts } from '@/content/blog';
import { pick } from '@/content/marketing';
import { articleMetadata, articleSchema } from './blog-seo';
import { localizedUrl } from './seo';

describe('article search and sharing metadata', () => {
  it('matches the localized article, date, and unique image across all metadata', () => {
    for (const post of blogPosts) for (const locale of ['en', 'ja'] as const) {
      const metadata = articleMetadata(post, locale);
      const schema = articleSchema(post, locale);
      expect(metadata.alternates?.canonical).toBe(localizedUrl(locale, `/blog/${post.slug}`));
      expect(metadata.openGraph).toMatchObject({ type: 'article', publishedTime: post.date });
      expect(metadata.openGraph.images).toEqual([expect.objectContaining({ url: expect.stringContaining(post.image.src), width: 1600, height: 900, alt: pick(post.image.alt, locale) })]);
      expect(metadata.twitter?.images).toEqual([expect.objectContaining({ url: schema.image, alt: pick(post.image.alt, locale) })]);
      expect(schema).toMatchObject({ datePublished: post.date, headline: pick(post.title, locale), inLanguage: locale, mainEntityOfPage: metadata.alternates?.canonical });
      expect(schema.dateModified).toBeUndefined();
    }
  });

  it('adds a real modification date without replacing publication history', () => {
    const post = { ...blogPosts[0], modifiedDate: '2026-10-10' };
    expect(articleSchema(post, 'en')).toMatchObject({ datePublished: post.date, dateModified: '2026-10-10' });
    expect(articleMetadata(post, 'en').openGraph).toMatchObject({ publishedTime: post.date, modifiedTime: '2026-10-10' });
  });
});
