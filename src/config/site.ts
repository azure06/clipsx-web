export const siteConfig = {
  name: 'ClipsX',
  tagline: 'The free, programmable clipboard for people who build.',
  description: 'Capture rich clipboard history, find it with text or optional local meaning search, and transform it with sandboxed extensions.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://clipsx.app',
  docsUrl: process.env.NEXT_PUBLIC_DOCS_URL ?? 'https://docs.clipsx.app',
  ogImage: '/opengraph-image',
  twitterHandle: '@clipsx_app',
  version: '0.1.0',
  repository: 'https://github.com/azure06/clipsx',
  releases: 'https://github.com/azure06/clipsx/releases',
  issues: 'https://github.com/azure06/clipsx/issues',
  sponsorUrl: (process.env.NEXT_PUBLIC_SPONSOR_URL ?? 'https://github.com/sponsors/azure06') || null,
} as const;

const documentationRoot = siteConfig.docsUrl.replace(/\/$/, '');

export const documentationConfig = {
  root: documentationRoot,
  gettingStarted: `${documentationRoot}/getting-started`,
  localAi: `${documentationRoot}/local-ai`,
  meaningSearch: `${documentationRoot}/meaning-search`,
  recall: `${documentationRoot}/recall`,
  extensions: `${documentationRoot}/extensions`,
  sync: `${documentationRoot}/sync`,
  privacy: `${documentationRoot}/privacy`,
  developerExtensions: `${documentationRoot}/developer-extensions`,
  rewriteExtension: `${documentationRoot}/rewrite-extension`,
} as const;

const localizedDocumentationPages = new Set([
  'index', 'getting-started', 'platform-support', 'core-workflows', 'local-ai',
  'meaning-search', 'recall', 'extensions', 'sync', 'privacy', 'troubleshooting',
]);

/** Localize user guides; developer documentation retains its English URL. */
export function localizeDocumentationUrl(href: string, locale: string): string {
  if (locale !== 'ja') return href;
  try {
    const root = new URL(documentationRoot);
    const url = new URL(href);
    if (url.origin !== root.origin) return href;
    const base = root.pathname.replace(/\/$/, '');
    if (url.pathname !== base && !url.pathname.startsWith(`${base}/`)) return href;
    const page = url.pathname.slice(base.length).replace(/^\/+|\/+$/g, '') || 'index';
    if (!localizedDocumentationPages.has(page)) return href;
    url.pathname = `${base}/ja/${page}`;
    return url.href;
  } catch {
    return href;
  }
}

export function getDocumentationConfig(locale: string) {
  return Object.fromEntries(Object.entries(documentationConfig).map(([key, value]) =>
    [key, localizeDocumentationUrl(value, locale)]
  )) as { [K in keyof typeof documentationConfig]: string };
}
