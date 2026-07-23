import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { BookOpen, Clock3 } from 'lucide-react';
import { blogPostPreviews } from '@/content/blog';
import type { Locale } from '@/i18n/config';

export const metadata: Metadata = { title: 'Blog' };

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('BlogPage');

  return (
    <div className="py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <h1 className="font-heading text-4xl sm:text-5xl font-black text-gray-900 mb-4 dark:text-white">{t('title')}</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">{t('subtitle')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {blogPostPreviews[locale].map((post) => (
            <article key={post.slug} className="rounded-2xl border border-gray-200 bg-white p-7 dark:border-white/8 dark:bg-white/3">
              <div className="flex items-center justify-between gap-3 mb-8">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"><BookOpen size={20} /></span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400"><Clock3 size={14} />{t('coming_soon')}</span>
              </div>
              <h2 className="font-heading text-xl font-bold text-gray-900 mb-3 dark:text-white">{t(`${post.translationKey}_title`)}</h2>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{t(`${post.translationKey}_description`)}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
