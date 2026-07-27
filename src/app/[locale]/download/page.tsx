import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { use } from 'react';
import type { Metadata } from 'next';
import { Apple, Monitor, Terminal, ArrowDownCircle } from 'lucide-react';
import { downloadTargets } from '@/config/download';

export const metadata: Metadata = { title: 'Download' };

const platformIcons = {
  macos: Apple,
  windows: Monitor,
  linux: Terminal,
};

export default function DownloadPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('DownloadPage');
  const translate = (key: string) => t(key as Parameters<typeof t>[0]);

  return (
    <div className="py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="text-center mb-16">
          <h1 className="font-heading text-4xl sm:text-5xl font-black text-gray-900 mb-4 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">{t('subtitle')}</p>
        </div>

        {/* Download cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {downloadTargets.map((target) => {
            const Icon = platformIcons[target.platform];
            return (
              <div
                key={target.platform}
                className="flex flex-col items-center text-center rounded-2xl border border-gray-200 bg-white p-8 hover:border-cyan-500/30 transition-all dark:border-white/8 dark:bg-white/3"
              >
                <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400">
                  <Icon size={28} />
                </div>
                <h2 className="font-heading font-bold text-gray-900 text-xl mb-1 dark:text-white">
                  {translate(target.titleKey)}
                </h2>
                <p className="text-xs text-gray-600 mb-6 dark:text-gray-500">{translate(target.reqKey)}</p>
                <a
                  href={target.url}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 text-sm font-bold text-white hover:bg-cyan-400 transition-colors"
                >
                  <ArrowDownCircle size={16} />
                  {t('download_btn')} {target.ext}
                </a>
              </div>
            );
          })}
        </div>

        {/* Install steps */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 mb-8 dark:border-white/8 dark:bg-white/3">
          <h2 className="font-heading font-bold text-gray-900 text-xl mb-6 dark:text-white">
            {t('install_title')}
          </h2>
          <ol className="space-y-4">
            {['install_1', 'install_2', 'install_3', 'install_4'].map((k, i) => (
              <li key={k} className="flex items-start gap-4">
                <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-400 text-xs font-bold">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-600 pt-0.5 dark:text-gray-400">{translate(k)}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-xs text-gray-500 text-center dark:text-gray-600">{t('note')}</p>
      </div>
    </div>
  );
}
