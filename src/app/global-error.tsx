'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => { Sentry.captureException(error) }, [error])
  return <html><body><main className="mx-auto max-w-xl p-10">
    <h1 className="text-2xl font-bold">Something went wrong</h1>
    <p className="mt-3">The error was reported. You can safely try again.</p>
    <button className="mt-6 rounded-lg bg-violet-700 px-4 py-2 text-white" onClick={reset}>Try again</button>
  </main></body></html>
}
