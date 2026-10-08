import type { Metadata } from 'next';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { releases } from '@/content/changelog';
import { pick } from '@/content/marketing';
import { pageMetadata } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

const copy = {
  en: { title: 'Changelog', description: 'What’s new in ClipsX: release notes, supported platforms, and upgrade information.', eyebrow: 'Release history', added: 'Changes in this release', limits: 'Platform and upgrade notes', download: 'Download ClipsX', source: 'Full release notes', blog: 'Read the blog' },
  ja: { title: '更新履歴', description: 'ClipsX のリリースノート、対応プラットフォーム、アップグレード情報。', eyebrow: 'リリース履歴', added: 'このリリースの変更', limits: 'プラットフォームと更新の注意点', download: 'ClipsX をダウンロード', source: 'リリースノート全文', blog: 'ブログを読む' },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/changelog', copy[locale].title, copy[locale].description);
}

export default async function ChangelogPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = copy[locale];
  return <div className="marketing-shell pb-24 pt-20">
    <header className="border-b border-(--ui-border) pb-12">
      <p className="eyebrow text-(--ui-violet)">{c.eyebrow}</p>
      <h1 className="mt-5 font-heading text-5xl font-bold tracking-tight sm:text-7xl">{c.title}</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-(--ui-text-muted)">{c.description}</p>
    </header>
    {releases.map(release => <article key={release.version} id={`v${release.version.replaceAll('.', '-')}`} className="grid scroll-mt-24 gap-8 border-b border-(--ui-border) py-14 last:border-0 lg:grid-cols-[.35fr_1fr]">
      <div>
        <span className="inline-flex rounded-full border border-(--ui-border) bg-(--ui-surface) px-4 py-2 font-mono text-sm">v{release.version}</span>
        <time dateTime={release.publishedAt} className="mt-4 block text-sm text-(--ui-text-muted)">{new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(release.publishedAt))}</time>
      </div>
      <div className="max-w-3xl">
        <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">{pick(release.title, locale)}</h2>
        <p className="mt-5 text-lg leading-8 text-(--ui-text-muted)">{pick(release.description, locale)}</p>
        <h3 className="mt-9 font-heading text-lg font-bold">{c.added}</h3>
        <ul className="mt-4 list-disc space-y-3 pl-5 leading-7 text-(--ui-text-muted)">{release.highlights.map(item => <li key={item.en}>{pick(item, locale)}</li>)}</ul>
        <section className="mt-9 rounded-2xl border border-(--ui-border) bg-(--ui-surface) p-6">
          <h3 className="font-heading text-lg font-bold">{c.limits}</h3>
          <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-7 text-(--ui-text-muted)">{release.limits.map(item => <li key={item.en}>{pick(item, locale)}</li>)}</ul>
        </section>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/download" className="button-primary gap-2 px-5 py-3">{c.download}<ArrowRight size={16} aria-hidden="true" /></Link>
          <a href={release.url} className="button-secondary gap-2 px-5 py-3" target="_blank" rel="noreferrer">{c.source}<ArrowUpRight size={16} aria-hidden="true" /></a>
          <Link href="/blog" className="button-secondary px-5 py-3">{c.blog}</Link>
        </div>
      </div>
    </article>)}
  </div>;
}

