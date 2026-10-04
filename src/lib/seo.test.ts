import { describe, expect, it } from 'vitest';
import { siteConfig } from '@/config/site';
import { blogPosts } from '@/content/blog';
import sitemap from '@/app/sitemap';
import { jsonLd, localizedUrl, pageMetadata, publicRoutes } from './seo';

describe('public search metadata', () => {
  it('keeps each language canonical on its own page with reciprocal alternates', () => {
    for (const locale of ['en', 'ja'] as const) {
      const metadata = pageMetadata(locale, '/pricing', 'Plans', 'Free and Pro');
      expect(metadata.alternates?.canonical).toBe(localizedUrl(locale, '/pricing'));
      expect(metadata.alternates?.languages).toEqual({
        en: localizedUrl('en', '/pricing'), ja: localizedUrl('ja', '/pricing'),
        'x-default': localizedUrl('en', '/pricing'),
      });
      expect(metadata.openGraph).toMatchObject({ url: localizedUrl(locale, '/pricing'), title: 'Plans', description: 'Free and Pro', locale: locale === 'ja' ? 'ja_JP' : 'en_US' });
      expect(metadata.twitter).toMatchObject({ title: 'Plans', description: 'Free and Pro', card: 'summary_large_image' });
    }
  });

  it('lists only public canonical pages and uses content dates rather than build dates', () => {
    const entries = sitemap();
    expect(entries).toHaveLength((publicRoutes.length + blogPosts.length) * 2);
    expect(new Set(entries.map(entry => entry.url)).size).toBe(entries.length);
    expect(entries.some(entry => /\/(account|vault|signin|signup|api|auth|identity-studio)(\/|$)/.test(entry.url))).toBe(false);
    for (const entry of entries) {
      expect(entry.url.startsWith(siteConfig.url.replace(/\/$/, ''))).toBe(true);
      const post = blogPosts.find(post => entry.url.endsWith(`/blog/${post.slug}`));
      expect(entry.lastModified).toBe(post?.modifiedDate ?? post?.date);
      expect(entry.alternates?.languages?.['x-default']).toContain('/en');
    }
  });

  it('escapes script-closing text without changing structured data', () => {
    const value = { headline: '</script><script>alert(1)</script>' };
    const encoded = jsonLd(value);
    expect(encoded).not.toContain('<');
    expect(JSON.parse(encoded)).toEqual(value);
  });
});
