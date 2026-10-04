import type { MetadataRoute } from 'next';
import { locales } from '@/i18n/config';
import { blogPosts } from '@/content/blog';
import { languageAlternates, localizedUrl, publicRoutes } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [...publicRoutes, ...blogPosts.map(post => `/blog/${post.slug}`)];
  return routes.flatMap(path => locales.map(locale => {
    const post = blogPosts.find(post => path === `/blog/${post.slug}`);
    return {
      url: localizedUrl(locale, path),
      ...(post ? { lastModified: post.modifiedDate ?? post.date } : {}),
      alternates: { languages: languageAlternates(path) },
    };
  }));
}
