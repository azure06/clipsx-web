import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { use } from 'react';
import type { Metadata } from 'next';
import { Search, ScanText, Lock, Zap, Archive, Tag, RefreshCw, Keyboard } from 'lucide-react';

export const metadata: Metadata = { title: 'Features' };

export default function FeaturesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('FeaturesPage');

  const features = [
    { icon: Search, key: 'search' },
    { icon: ScanText, key: 'ocr' },
    { icon: Zap, key: 'detect' },
    { icon: Lock, key: 'local' },
    { icon: Archive, key: 'history' },
    { icon: Tag, key: 'tags' },
    { icon: RefreshCw, key: 'updater' },
    { icon: Keyboard, key: 'keyboard' },
  ] as const;

  return (
    <div className="py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h1 className="font-heading text-4xl sm:text-5xl font-black text-gray-900 mb-4 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="flex gap-5 rounded-2xl border border-gray-200 bg-white p-6 hover:border-cyan-500/30 transition-all dark:border-white/8 dark:bg-white/3"
            >
              <div className="shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                <Icon size={22} />
              </div>
              <div>
                <h3 className="font-heading font-bold text-gray-900 mb-1.5 dark:text-white">
                  {t(`${key}_title` as any)}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed dark:text-gray-500">
                  {t(`${key}_body` as any)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
