import * as Sentry from '@sentry/nextjs'
import { safeRouteName } from '@/lib/observability/privacy'

const enabled = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN) &&
  (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true')

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,
  enableLogs: false,
  tracesSampleRate: process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ? 0.1 : 0,
  tracePropagationTargets: [/^https:\/\/(?:www\.)?clipsx\.app(?:\/|$)/],
  beforeBreadcrumb(breadcrumb) {
    return breadcrumb.category?.startsWith('clipsx.') ? breadcrumb : null
  },
  beforeSend(event) {
    delete event.request
    delete event.extra
    event.breadcrumbs = event.breadcrumbs?.filter(item => item.category?.startsWith('clipsx.'))
    if (event.message) event.message = 'A website browser failure occurred'
    event.exception?.values?.forEach(value => { value.value = 'A website browser failure occurred' })
    return event
  },
  beforeSendTransaction(event) {
    delete event.request
    event.transaction = safeRouteName(event.transaction ?? '/')
    event.spans = event.spans?.map(span => ({ ...span, description: span.op, data: {} }))
    return event
  },
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
