import type { Metadata } from 'next';
import type { Locale } from '@/i18n/config';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/contact', locale === 'ja' ? 'お問い合わせ' : 'Contact ClipsX', locale === 'ja' ? 'ClipsX に関する質問やフィードバックをお送りください。' : 'Questions or feedback about ClipsX? Get in touch with the team.');
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
