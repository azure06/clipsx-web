import { assertLocale } from '@/i18n/validate';
import { redirect } from 'next/navigation';

export default async function VaultPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; assertLocale(locale);
  redirect(`/${locale}/vault/collections`);
}
