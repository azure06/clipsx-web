/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://clipsx.app',
  generateRobotsTxt: true,
  exclude: ['/account', '/account/*', '/api/*', '/auth/*'],
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/' },
      { userAgent: '*', disallow: ['/account', '/api', '/auth'] },
    ],
  },
  alternateRefs: [
    { href: 'https://clipsx.app/en', hreflang: 'en' },
    { href: 'https://clipsx.app/ja', hreflang: 'ja' },
  ],
};
