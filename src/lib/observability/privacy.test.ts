import { describe, expect, it } from 'vitest'
import { cleanPathname, isPublicAnalyticsPath, safeRouteName, sanitizeAnalyticsUrl } from './privacy'

describe('observability privacy routing', () => {
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
  it('rejects analytics events with queries or private routes', () => {
    expect(sanitizeAnalyticsUrl('/en/pricing?campaign=secret')).toBeNull()
    expect(sanitizeAnalyticsUrl('/en/account')).toBeNull()
    expect(sanitizeAnalyticsUrl('/en/download')).toBe('/en/download')
  })
})
