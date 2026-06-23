export const siteConfig = {
  name: 'ClipsX',
  tagline: 'Fast, private clipboard history with semantic search.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://clipsx.app',
  ogImage: '/og-image.png',
  twitterHandle: '@clipsx_app',
  version: '0.1.0',
} as const;
