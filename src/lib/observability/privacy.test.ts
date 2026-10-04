import { describe, expect, it } from 'vitest'
import { blogPosts } from '@/content/blog'
import { cleanPathname, filterPublicObservabilityEvent, isPublicAnalyticsPath, safeRouteName, sanitizeAnalyticsUrl } from './privacy'

describe('observability privacy routing', () => {
  it('counts every published article in both languages', () => {
    for (const article of blogPosts) {
      for (const locale of ['en', 'ja']) {
        const path = `/${locale}/blog/${article.slug}`
        expect(isPublicAnalyticsPath(path)).toBe(true)
        expect(sanitizeAnalyticsUrl(`https://clipsx.app${path}`)).toBe(`https://clipsx.app${path}`)
      }
    }
  })
  it('recognizes the public path without retaining query data', () => {
    expect(isPublicAnalyticsPath('/en/pricing')).toBe(true)
    expect(cleanPathname('/en/pricing?campaign=secret')).toBe('/en/pricing')
  })
  it.each(['/en/vault', '/ja/account', '/auth/callback', '/api/account', '/en/blog/550e8400-e29b-41d4-a716-446655440000'])(
    'rejects private or identifier-bearing path %s', path => expect(isPublicAnalyticsPath(path)).toBe(false)
  )
  it('normalizes identifiers in Sentry route names', () => {
    expect(safeRouteName('/en/items/550e8400-e29b-41d4-a716-446655440000?q=private')).toBe('/en/items/[id]')
  })
  it('removes query and fragment data without losing public visits', () => {
    expect(sanitizeAnalyticsUrl('/en/pricing?campaign=secret#plan')).toBe('/en/pricing')
    expect(sanitizeAnalyticsUrl('/en/account')).toBeNull()
    expect(sanitizeAnalyticsUrl('/en/download')).toBe('/en/download')
  })
  it.each([
    'https://clipsx.app/en/download',
    'https://clipsx.app/ja/blog/local-first-is-a-data-boundary',
    'http://localhost:3000/en',
    'https://clipsx-web-preview.vercel.app/ja/download',
  ])('accepts the absolute SDK URL %s', url => {
    expect(sanitizeAnalyticsUrl(url)).toBe(url)
    expect(sanitizeAnalyticsUrl(`${url}?utm_source=github&token=secret#section`)).toBe(url)
  })
  it.each([
    'https://clipsx.app/en/account?token=secret',
    'https://clipsx.app/ja/vault',
    'https://clipsx.app/auth/callback',
    'https://clipsx.app/api/account',
    'https://clipsx.app/en/%61ccount',
    'https://clipsx.app/en/blog/550e8400-e29b-41d4-a716-446655440000',
    '/en/blog/%76ault', '/en/blog/%2Faccount', '/en/blog/%E0%A4%A',
    '/unknown', '', 'not a URL', '//clipsx.app/en/download',
    'https://user:password@clipsx.app/en/download', 'javascript:alert(1)',
    'https:\\clipsx.app\\en\\download',
  ])('drops private, malformed or unsupported URLs %s', url => {
    expect(sanitizeAnalyticsUrl(url)).toBeNull()
  })
  it.each(['pageview', 'event', 'vital'])('filters %s events at send time and preserves SDK fields', type => {
    const event = { type, url: 'https://clipsx.app/ja/download?token=secret#start', route: '/[locale]/download' }
    expect(filterPublicObservabilityEvent(event)).toEqual({ ...event, url: 'https://clipsx.app/ja/download' })
    expect(event.url).toContain('secret')
    // Loaded scripts can outlive a public-to-private client navigation.
    expect(filterPublicObservabilityEvent({ ...event, url: 'https://clipsx.app/ja/account' })).toBeNull()
  })
})
