const PRIVATE_SEGMENTS = new Set(['account', 'auth', 'api', 'vault'])
const PUBLIC_SEGMENTS = new Set([
  '', 'blog', 'changelog', 'contact', 'developers', 'download', 'extensions', 'faq',
  'features', 'icon-lab', 'identity-studio', 'meaning-search', 'pricing', 'privacy',
  'product', 'recall', 'signin', 'signup', 'terms',
])

const IDENTIFIER = /^(?:\d{6,}|[0-9a-f]{8}-[0-9a-f-]{27,}|[A-Za-z0-9_-]{24,})$/i

export function cleanPathname(value: string): string {
  const raw = value.split(/[?#]/, 1)[0] || '/'
  return raw.startsWith('/') ? raw : `/${raw}`
}

export function isPublicAnalyticsPath(value: string): boolean {
  const segments = cleanPathname(value).split('/').filter(Boolean)
  if (segments[0] === 'en' || segments[0] === 'ja') segments.shift()
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
  if (/[?#]/.test(value) || !isPublicAnalyticsPath(value)) return null
  return cleanPathname(value)
}
