export const siteConfig = {
  name: 'ClipsX',
  tagline: 'The free, programmable clipboard for people who build.',
  description: 'Capture rich clipboard history, find it with text or optional local meaning search, and transform it with sandboxed extensions.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://clipsx.app',
  ogImage: '/opengraph-image',
  twitterHandle: '@clipsx_app',
  version: '0.1.0',
  repository: 'https://github.com/azure06/clipsx',
  releases: 'https://github.com/azure06/clipsx/releases',
  issues: 'https://github.com/azure06/clipsx/issues',
} as const;
