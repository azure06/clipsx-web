import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { getUser } from '@/lib/supabase/server';
import { VaultOnboardingClient } from './VaultOnboardingClient';

export default async function VaultPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getUser();
  if (!user) redirect(`/${locale}/signin`);

  return <VaultOnboardingClient accountId={user.id} />;
}
