import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { LegalPage } from '@/components/marketing/LegalPage';
import { termsContent } from '@/content/legal';
import type { Locale } from '@/i18n/config';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/terms', termsContent[locale].title, termsContent[locale].summary);
}

export default async function Terms({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPage locale={locale} document={termsContent[locale]} kind="terms" />;
}
