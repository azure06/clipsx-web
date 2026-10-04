import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => ({
  pathname: '/en/download',
  analytics: vi.fn(),
  speed: vi.fn(),
}))
vi.mock('next/navigation', () => ({ usePathname: () => sdk.pathname }))
vi.mock('@sentry/nextjs', () => ({ setUser: vi.fn(), setTag: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))
vi.mock('@vercel/analytics/next', () => ({ Analytics: (props: unknown) => { sdk.analytics(props); return null } }))
vi.mock('@vercel/speed-insights/next', () => ({ SpeedInsights: (props: unknown) => { sdk.speed(props); return null } }))

import { WebObservability } from './WebObservability'

describe('public website measurement wiring', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each(['/en/download', '/ja/blog/why-clipboard-extensions-need-boundaries'])(
    'connects both SDKs to the privacy filter on %s', pathname => {
      sdk.pathname = pathname
      renderToStaticMarkup(createElement(WebObservability, { identity: null }))
      for (const mock of [sdk.analytics, sdk.speed]) {
        expect(mock).toHaveBeenCalledOnce()
        const { beforeSend } = mock.mock.calls[0][0] as {
          beforeSend: (event: { type: string; url: string }) => unknown
        }
        const event = { type: mock === sdk.analytics ? 'pageview' : 'vital', url: `https://clipsx.app${pathname}?token=secret#section` }
        expect(beforeSend(event)).toEqual({ ...event, url: `https://clipsx.app${pathname}` })
        expect(beforeSend({ ...event, url: 'https://clipsx.app/en/vault' })).toBeNull()
      }
    },
  )

  it.each(['/en/account', '/ja/vault', '/en/unknown'])(
    'does not mount measurement SDKs on %s', pathname => {
      sdk.pathname = pathname
      renderToStaticMarkup(createElement(WebObservability, { identity: null }))
      expect(sdk.analytics).not.toHaveBeenCalled()
      expect(sdk.speed).not.toHaveBeenCalled()
    },
  )
})
