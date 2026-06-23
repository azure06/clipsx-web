import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { use } from 'react';
import type { Metadata } from 'next';
import { changelog } from '@/config/changelog';
import { Badge } from '@/components/ui/Badge';

export const metadata: Metadata = { title: 'Changelog' };

export default function ChangelogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('ChangelogPage');

  return (
    <div className="py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-16">
          <h1 className="font-heading text-4xl sm:text-5xl font-black text-white mb-4">
            {t('title')}
          </h1>
          <p className="text-lg text-gray-400">{t('subtitle')}</p>
        </div>

        <div className="space-y-12">
          {changelog.map((entry) => (
            <div key={entry.version} className="relative pl-8 border-l border-white/8">
              <div className="absolute -left-2 top-0 h-4 w-4 rounded-full bg-cyan-500" />
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Badge variant="cyan">v{entry.version}</Badge>
                <span className="text-xs text-gray-600">{entry.date}</span>
              </div>
              <ul className="space-y-2">
                {entry.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-400">
                    <span className="text-cyan-500 mt-1.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
