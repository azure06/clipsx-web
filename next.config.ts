import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs/config';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const sentryRelease = process.env.SENTRY_RELEASE ??
  (process.env.VERCEL_GIT_COMMIT_SHA ? `clipsx-web@${process.env.VERCEL_GIT_COMMIT_SHA}` : undefined);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_SENTRY_RELEASE: sentryRelease,
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: 'infiniti-next',
  project: 'clipsx-web',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  release: sentryRelease ? { name: sentryRelease, setCommits: { auto: true } } : undefined,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  silent: !process.env.CI,
  telemetry: false,
});
