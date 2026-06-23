import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { use } from 'react';
import { Link } from '@/i18n/routing';
import { Badge } from '@/components/ui/Badge';
import { Search, ScanText, Lock, Zap, Globe, Tag } from 'lucide-react';

export default function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('HomePage');

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 sm:px-6 text-center overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/5 rounded-full blur-3xl" />
        </div>

        <Badge variant="cyan" className="mb-6">{t('hero_badge')}</Badge>

        <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.05] max-w-3xl">
          {t('hero_title')}{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
            {t('hero_title_accent')}
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-xl leading-relaxed">
          {t('hero_subtitle')}
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/download"
            className="rounded-xl bg-cyan-500 px-8 py-4 text-base font-bold text-white hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20"
          >
            {t('hero_cta_download')}
          </Link>
          <Link
            href="/pricing"
            className="rounded-xl border border-white/15 px-8 py-4 text-base font-semibold text-gray-300 hover:border-white/30 hover:text-white transition-colors"
          >
            {t('hero_cta_pricing')}
          </Link>
        </div>

        <p className="mt-6 text-xs text-gray-600">{t('hero_platform')}</p>
      </section>

      {/* Feature grid */}
      <section className="py-24 px-4 sm:px-6 bg-gray-950/50">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-heading text-3xl sm:text-4xl font-black text-white text-center mb-16">
            {t('section_why_title')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Search, title: t('feature_search_title'), body: t('feature_search_body') },
              { icon: ScanText, title: t('feature_ocr_title'), body: t('feature_ocr_body') },
              { icon: Lock, title: t('feature_local_title'), body: t('feature_local_body') },
              { icon: Zap, title: t('feature_detect_title'), body: t('feature_detect_body') },
            ].map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/8 bg-white/3 p-6 hover:border-cyan-500/30 hover:bg-cyan-500/3 transition-all"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Icon size={20} />
                </div>
                <h3 className="font-heading font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {[
            { value: t('stat_formats'), label: t('stat_formats_label') },
            { value: t('stat_search'), label: t('stat_search_label') },
            { value: t('stat_privacy'), label: t('stat_privacy_label') },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="font-heading text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                {value}
              </div>
              <div className="mt-2 text-sm text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Platform */}
      <section className="py-16 px-4 sm:px-6 border-t border-white/5">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-6">
            {t('platform_title')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {[t('platform_macos'), t('platform_windows'), t('platform_linux')].map((p) => (
              <span
                key={p}
                className="rounded-full border border-white/10 px-5 py-2 text-sm text-gray-400"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/40 to-blue-950/40 p-12">
          <h2 className="font-heading text-3xl sm:text-4xl font-black text-white mb-4">
            {t('cta_title')}
          </h2>
          <p className="text-gray-400 mb-8">{t('cta_body')}</p>
          <Link
            href="/download"
            className="inline-flex rounded-xl bg-cyan-500 px-8 py-4 text-base font-bold text-white hover:bg-cyan-400 transition-colors"
          >
            {t('cta_download')}
          </Link>
        </div>
      </section>
    </>
  );
}
