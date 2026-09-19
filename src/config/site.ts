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

const documentationRoot = 'https://infiniti-82a6b77b.mintlify.site/docs';

export const documentationConfig = {
  root: documentationRoot,
  gettingStarted: `${documentationRoot}/getting-started`,
  localAi: `${documentationRoot}/local-ai`,
  extensions: `${documentationRoot}/extensions`,
  sync: `${documentationRoot}/sync`,
  privacy: `${documentationRoot}/privacy`,
} as const;
