import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { getUser } from '@/lib/supabase/server';
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
    <div className="px-4 pt-6 pb-16 sm:px-6 sm:pt-8 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 font-heading text-3xl font-black text-gray-900 dark:text-white">{t('title')}</h1>
        <Suspense>
          <AccountClient user={user} />
        </Suspense>
      </div>
    </div>
  );
}
