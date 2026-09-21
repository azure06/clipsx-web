import type { Metadata } from 'next';
import Script from 'next/script';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { siteConfig } from '@/config/site';
import { getUser } from '@/lib/supabase/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { WebObservability } from '@/components/observability/WebObservability';
import '../globals.css';

const themeBootstrap = `(function(){try{var p=localStorage.getItem('clipsx-web-theme');var d=p==='dark'||(p!=='light'&&p!=='dark'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){}})()`;

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — The free, programmable clipboard`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    type: 'website',
    siteName: siteConfig.name,
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    creator: siteConfig.twitterHandle,
  },
  robots: { index: true, follow: true },
  icons: { icon: '/icon.svg' },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages();
  const user = await getUser();
  const provider = user?.app_metadata.provider;
  const authProvider: 'google' | 'github' | 'email' | 'unknown' =
    provider === 'google' || provider === 'github' || provider === 'email' ? provider : 'unknown';
  const rawName = user?.user_metadata.full_name ?? user?.user_metadata.name;
  const telemetryIdentity = user ? {
    id: user.id,
    email: user.email_confirmed_at ? (user.email ?? null) : null,
    username: typeof rawName === 'string' && rawName.trim() ? rawName.trim().slice(0, 100) : null,
    authProvider,
  } : null;

  return (
      <html
        lang={locale}
        suppressHydrationWarning
      >
        <head>
          <Script
            id="clipsx-theme-bootstrap"
            strategy="beforeInteractive"
          >
            {themeBootstrap}
          </Script>
        </head>
        <body className="min-h-screen bg-(--ui-canvas) text-(--ui-text) antialiased font-sans">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <Header user={user} />
            <main className="pt-16">{children}</main>
            <Footer />
            <WebObservability identity={telemetryIdentity} />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
