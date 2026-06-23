import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { getUser, createClient } from '@/lib/supabase/server';
import { AccountClient } from './AccountClient';

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getUser();
  if (!user) redirect(`/${locale}/signin`);

  const t = await getTranslations('AccountPage');

  return (
    <div className="py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-xl">
        <h1 className="font-heading text-3xl font-black text-gray-900 mb-10 dark:text-white">{t('title')}</h1>
        <AccountClient user={user} />
      </div>
    </div>
  );
}
