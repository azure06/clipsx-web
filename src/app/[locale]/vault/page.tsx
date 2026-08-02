import { redirect } from 'next/navigation';

export default async function VaultPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/vault/collections`);
}
