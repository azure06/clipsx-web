const PRIVATE_SEGMENTS = new Set(['account', 'auth', 'api', 'vault'])
const PUBLIC_SEGMENTS = new Set([
  '', 'blog', 'changelog', 'contact', 'developers', 'download', 'extensions', 'faq',
  'features', 'icon-lab', 'identity-studio', 'meaning-search', 'pricing', 'privacy',
  'product', 'recall', 'signin', 'signup', 'terms',
])

const IDENTIFIER = /^(?:\d{6,}|[0-9a-f]{8}-[0-9a-f-]{27,}|[A-Za-z0-9_-]{24,})$/i
// Explicit exceptions for published slugs that resemble long opaque identifiers.
// Keep article content out of the client-side observability bundle.
const PUBLIC_BLOG_SLUGS = new Set([
  'local-first-is-a-data-boundary',
  'meaning-search-with-ollama',
  'why-clipboard-extensions-need-boundaries',
])

export function cleanPathname(value: string): string {
  const raw = value.split(/[?#]/, 1)[0] || '/'
  return raw.startsWith('/') ? raw : `/${raw}`
}

export function isPublicAnalyticsPath(value: string): boolean {
  let segments: string[]
  try {
    segments = cleanPathname(value).split('/').filter(Boolean).map(decodeURIComponent)
  } catch {
    return false
  }
  if (segments.some(segment => /[\\/?#]/.test(segment))) return false
  if (segments[0] === 'en' || segments[0] === 'ja') segments.shift()
  if (segments.length === 2 && segments[0] === 'blog' && PUBLIC_BLOG_SLUGS.has(segments[1])) return true
  if (segments.some(segment => PRIVATE_SEGMENTS.has(segment) || IDENTIFIER.test(segment))) return false
  return PUBLIC_SEGMENTS.has(segments[0] ?? '')
}

export function safeRouteName(value: string): string {
  const segments = cleanPathname(value).split('/').filter(Boolean).map(segment =>
    IDENTIFIER.test(segment) ? '[id]' : segment
  )
  return `/${segments.join('/')}`
}

export function sanitizeAnalyticsUrl(value: string): string | null {
  // Vercel supplies absolute URLs. Preserve their origin while removing URL data.
  // Also accept root-relative paths for local callers and tests.
  if (!value || value.includes('\\') || value.startsWith('//')) return null
  const relative = value.startsWith('/')
  try {
    const url = relative ? new URL(value, 'https://clipsx.invalid') : new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null
    if (!isPublicAnalyticsPath(url.pathname)) return null
    url.search = ''
    url.hash = ''
    return relative ? url.pathname : url.href
  } catch {
    return null
  }
}

export function filterPublicObservabilityEvent<T extends { url: string }>(event: T): T | null {
  const url = sanitizeAnalyticsUrl(event.url)
  return url ? { ...event, url } : null
}
