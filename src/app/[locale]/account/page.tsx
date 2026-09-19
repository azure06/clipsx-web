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
    <div className="min-h-[calc(100vh-4rem)] bg-[radial-gradient(circle_at_85%_0%,rgba(139,92,246,.12),transparent_30rem)] px-4 pt-8 pb-20 sm:px-6 sm:pt-10 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div aria-hidden="true" className="mb-4 h-1 w-16 rounded-full bg-linear-to-r from-blue-400 to-violet-400" />
        <h1 className="mb-8 font-heading text-3xl font-black tracking-tight text-white sm:text-4xl">{t('title')}</h1>
        <Suspense>
          <AccountClient user={user} />
        </Suspense>
      </div>
    </div>
  );
}
