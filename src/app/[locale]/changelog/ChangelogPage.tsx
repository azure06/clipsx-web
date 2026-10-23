import { assertLocale } from '@/i18n/validate';
import type { Metadata } from 'next';
import { ArrowRight, ArrowUpRight, ChevronDown, Download, History, Sparkles } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { releases } from '@/content/changelog';
import { pick } from '@/content/marketing';
import { pageMetadata } from '@/lib/seo';
import type { Locale } from '@/i18n/config';
import './changelog.css';

const copy = {
  en: {
    title: 'Changelog', description: 'The story of ClipsX, one release at a time. See what changed, what to know before upgrading, and where the product is heading.', eyebrow: 'Release history',
    latest: 'Latest release', current: 'Current', added: 'What changed', limits: 'Before you upgrade', download: 'Download ClipsX', source: 'Full release notes', blog: 'Read the blog',
    archive: 'Release archive', archiveDescription: 'Older releases stay close without taking over the page. Open a year, then expand the version you need.', versions: 'versions', version: 'version',
    openYear: 'Browse releases from', openRelease: 'Open release details for', closing: 'Ready for the latest ClipsX?', closingBody: 'Download the current release, or inspect the source notes for every version in the archive.',
  },
  ja: {
    title: '更新履歴', description: 'ClipsX の歩みを、リリースごとに。変更内容、更新前の注意点、プロダクトの進化を確認できます。', eyebrow: 'リリース履歴',
    latest: '最新リリース', current: '最新版', added: '変更内容', limits: '更新前の注意点', download: 'ClipsX をダウンロード', source: 'リリースノート全文', blog: 'ブログを読む',
    archive: 'リリースアーカイブ', archiveDescription: '過去のリリースを、ページを長くしすぎずに整理しました。年を開き、必要なバージョンを展開できます。', versions: '件のリリース', version: '件のリリース',
    openYear: 'リリースを表示：', openRelease: 'リリース詳細を表示：', closing: '最新版の ClipsX を使ってみませんか？', closingBody: '最新版をダウンロードするか、アーカイブから各バージョンの詳細を確認できます。',
  },
} as const;

const releaseId = (version: string) => `v${version.replaceAll('.', '-')}`;
const formatDate = (locale: Locale, publishedAt: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(publishedAt));

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params; assertLocale(locale);
  return pageMetadata(locale, '/changelog', copy[locale].title, copy[locale].description);
}

export default async function ChangelogPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params; assertLocale(locale);
  setRequestLocale(locale);
  const c = copy[locale];
  const [latest, ...archive] = releases;
  type Release = (typeof releases)[number];
  const releasesByYear = archive.reduce<Record<string, Release[]>>((groups, release) => {
    const year = release.publishedAt.slice(0, 4);
    groups[year] = [...(groups[year] ?? []), release];
    return groups;
  }, {});

  return <div className="cx-changelog">
    <header className="cx-changelog-hero">
      <div className="marketing-shell">
        <div className="cx-changelog-hero-copy">
          <p className="eyebrow text-(--ui-violet)"><History size={15} aria-hidden="true" />{c.eyebrow}</p>
          <h1>{c.title}</h1>
          <p>{c.description}</p>
        </div>
        <div className="cx-changelog-counter" aria-label={`${releases.length} ${c.versions}`}>
          <span>{String(releases.length).padStart(2, '0')}</span>
          <div><strong>{c.versions}</strong><small>{releases.at(-1)?.publishedAt.slice(0, 4)} — {latest.publishedAt.slice(0, 4)}</small></div>
        </div>
      </div>
    </header>

    <div className="marketing-shell cx-changelog-body">
      <article id={releaseId(latest.version)} className="cx-release-featured scroll-mt-24">
        <div className="cx-release-featured-meta">
          <span className="cx-release-status"><Sparkles size={13} aria-hidden="true" />{c.latest}</span>
          <span className="cx-release-version">v{latest.version}</span>
          <time dateTime={latest.publishedAt}>{formatDate(locale, latest.publishedAt)}</time>
        </div>
        <div className="cx-release-featured-content">
          <span className="cx-release-current">{c.current}</span>
          <h2>{pick(latest.title, locale)}</h2>
          <p className="cx-release-lede">{pick(latest.description, locale)}</p>
          <div className="cx-release-feature-grid">
            <ReleaseSection title={c.added} items={latest.highlights.map(item => pick(item, locale))} />
            <ReleaseSection title={c.limits} items={latest.limits.map(item => pick(item, locale))} muted />
          </div>
          <div className="cx-release-actions">
            <Link href="/download" className="button-primary gap-2 px-5 py-3">{c.download}<ArrowRight size={16} aria-hidden="true" /></Link>
            <a href={latest.url} className="button-secondary gap-2 px-5 py-3" target="_blank" rel="noreferrer">{c.source}<ArrowUpRight size={16} aria-hidden="true" /></a>
            <Link href="/blog" className="cx-release-text-link">{c.blog}<ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
        </div>
      </article>

      <section className="cx-release-archive" aria-labelledby="release-archive-heading">
        <div className="cx-release-archive-heading">
          <div><p className="eyebrow text-(--ui-violet)">{c.archive}</p><h2 id="release-archive-heading">{c.archive}</h2></div>
          <p>{c.archiveDescription}</p>
        </div>
        <div className="cx-release-years">
          {Object.entries(releasesByYear).map(([year, yearReleases]) => <details className="cx-release-year" key={year}>
            <summary aria-label={`${c.openYear} ${year}`}>
              <span className="cx-release-year-marker" aria-hidden="true" /><span className="cx-release-year-label">{year}</span>
              <span className="cx-release-year-count">{yearReleases.length} {yearReleases.length === 1 ? c.version : c.versions}</span><ChevronDown size={19} aria-hidden="true" />
            </summary>
            <div className="cx-release-year-list">
              {yearReleases.map(release => <details key={release.version} id={releaseId(release.version)} className="cx-release-entry scroll-mt-24">
                <summary aria-label={`${c.openRelease} v${release.version}`}>
                  <span className="cx-release-entry-version">v{release.version}</span><span className="cx-release-entry-title">{pick(release.title, locale)}</span>
                  <time dateTime={release.publishedAt}>{formatDate(locale, release.publishedAt)}</time><ChevronDown size={17} aria-hidden="true" />
                </summary>
                <div className="cx-release-entry-content">
                  <p>{pick(release.description, locale)}</p>
                  <div className="cx-release-entry-grid">
                    <ReleaseSection title={c.added} items={release.highlights.map(item => pick(item, locale))} />
                    <ReleaseSection title={c.limits} items={release.limits.map(item => pick(item, locale))} />
                  </div>
                  <a href={release.url} className="cx-release-text-link" target="_blank" rel="noreferrer">{c.source}<ArrowUpRight size={15} aria-hidden="true" /></a>
                </div>
              </details>)}
            </div>
          </details>)}
        </div>
      </section>

      <section className="cx-changelog-closing">
        <div><span><Download size={18} aria-hidden="true" /></span><div><h2>{c.closing}</h2><p>{c.closingBody}</p></div></div>
        <Link href="/download" className="button-primary gap-2 px-5 py-3">{c.download}<ArrowRight size={16} aria-hidden="true" /></Link>
      </section>
    </div>
  </div>;
}

function ReleaseSection({ title, items, muted = false }: { title: string; items: string[]; muted?: boolean }) {
  return <section className={muted ? 'cx-release-muted' : undefined}><h3>{title}</h3><ul>{items.map(item => <li key={item}>{item}</li>)}</ul></section>;
}
