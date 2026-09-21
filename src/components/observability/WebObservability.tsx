'use client'

import * as Sentry from '@sentry/nextjs'
import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isPublicAnalyticsPath, sanitizeAnalyticsUrl } from '@/lib/observability/privacy'

type SafeIdentity = {
  id: string
  email: string | null
  username: string | null
  authProvider: 'google' | 'github' | 'email' | 'unknown'
}

function applyIdentity(identity: SafeIdentity | null) {
  Sentry.setUser(identity ? {
    id: identity.id.slice(0, 128),
    email: identity.email?.slice(0, 254),
    username: identity.username?.slice(0, 100),
  } : null)
  Sentry.setTag('auth_provider', identity?.authProvider ?? 'signed_out')
}

function identityFromUser(user: {
  id: string
  email?: string
  email_confirmed_at?: string
  app_metadata: Record<string, unknown>
  user_metadata: Record<string, unknown>
} | null): SafeIdentity | null {
  if (!user) return null
  const provider = user.app_metadata['provider']
  const authProvider = provider === 'google' || provider === 'github' || provider === 'email'
    ? provider : 'unknown'
  const rawName = user.user_metadata['full_name'] ?? user.user_metadata['name']
  return {
    id: user.id,
    email: user.email_confirmed_at ? (user.email ?? null) : null,
    username: typeof rawName === 'string' && rawName.trim() ? rawName.trim().slice(0, 100) : null,
    authProvider,
  }
}

export function WebObservability({ identity }: { identity: SafeIdentity | null }) {
  const pathname = usePathname()
  const isPublic = isPublicAnalyticsPath(pathname)

  useEffect(() => {
    applyIdentity(identity)
    const supabase = createClient()
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      applyIdentity(identityFromUser(session?.user ?? null))
    })
    return () => data.subscription.unsubscribe()
  }, [identity])

  if (!isPublic) return null
  return <>
    <Analytics beforeSend={(event: BeforeSendEvent) => {
      const url = sanitizeAnalyticsUrl(event.url)
      return url ? { ...event, url } : null
    }} />
    <SpeedInsights />
  </>
}

export { identityFromUser }
