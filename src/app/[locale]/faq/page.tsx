import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { use } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'FAQ' };

export default function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('FaqPage');

  const faqs = [
    { q: 'q1', a: 'a1' },
    { q: 'q2', a: 'a2' },
    { q: 'q3', a: 'a3' },
    { q: 'q4', a: 'a4' },
    { q: 'q5', a: 'a5' },
    { q: 'q6', a: 'a6' },
  ] as const;

  return (
    <div className="py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-16">
          <h1 className="font-heading text-4xl sm:text-5xl font-black text-white mb-4">
            {t('title')}
          </h1>
          <p className="text-lg text-gray-400">{t('subtitle')}</p>
        </div>

        <div className="divide-y divide-white/8">
          {faqs.map(({ q, a }) => (
            <div key={q} className="py-8">
              <h2 className="font-heading font-bold text-white text-lg mb-3">{t(q)}</h2>
              <p className="text-gray-400 leading-relaxed">{t(a)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
