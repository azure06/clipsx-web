import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getUser } from '@/lib/supabase/server';

export default async function BillingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getUser();
  if (!user) redirect(`/${locale}/signin`);

  redirect(`/${locale}/account`);
}
