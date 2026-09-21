import * as Sentry from '@sentry/nextjs'
import { safeRouteName } from './src/lib/observability/privacy'

const enabled = Boolean(process.env.SENTRY_DSN) &&
  (process.env.VERCEL_ENV === 'production' || process.env.SENTRY_ENABLED === 'true')

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled,
  release: process.env.SENTRY_RELEASE ??
    (process.env.VERCEL_GIT_COMMIT_SHA ? `clipsx-web@${process.env.VERCEL_GIT_COMMIT_SHA}` : undefined),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,
  enableLogs: false,
  tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.1 : 0,
  beforeBreadcrumb(breadcrumb) {
    return breadcrumb.category?.startsWith('clipsx.') ? breadcrumb : null
  },
  beforeSend(event) {
    delete event.request
    delete event.extra
    event.breadcrumbs = event.breadcrumbs?.filter(item => item.category?.startsWith('clipsx.'))
    if (event.message) event.message = 'A website server failure occurred'
    event.exception?.values?.forEach(value => { value.value = 'A website server failure occurred' })
    return event
  },
  beforeSendTransaction(event) {
    delete event.request
    event.transaction = safeRouteName(event.transaction ?? '/')
    event.spans = event.spans?.map(span => ({ ...span, description: span.op, data: {} }))
    return event
  },
})
