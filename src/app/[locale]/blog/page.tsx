import type { Metadata } from 'next';
import { ArrowRight, Clock3 } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { PageIntro } from '@/components/marketing/Marketing';
import { blogPosts } from '@/content/blog';
import { pick } from '@/content/marketing';
import { pageMetadata } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/blog', locale === 'ja' ? 'ブログ' : 'Clipboard workflows & privacy blog', locale === 'ja' ? 'ClipsX のクリップボード活用、プライバシー、ローカル AI、拡張機能について。' : 'Practical notes on clipboard workflows, privacy, local AI, and ClipsX extensions.');
}

export default async function Blog({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <div className="marketing-shell pb-24">
    <PageIntro eyebrow={locale === 'ja' ? 'ブログ' : 'Blog'} title={locale === 'ja' ? 'クリップボードを、よく考える。' : 'Make more of your clipboard.'} description={locale === 'ja' ? 'プライバシー、ローカル AI、拡張可能なワークフローについて。' : 'Practical notes on privacy, local intelligence, and programmable workflows.'} />
    <div className="grid gap-5 md:grid-cols-3">{blogPosts.map(post => <article key={post.slug} className="marketing-card flex flex-col p-6">
      <div className="flex items-center gap-2 text-xs text-(--ui-text-muted)"><time dateTime={post.date}>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(post.date))}</time><span>·</span><Clock3 size={13} aria-hidden="true" /><span>{locale === 'ja' ? `約 ${post.readMinutes} 分` : `${post.readMinutes} min read`}</span></div>
      <h2 className="mt-6 font-heading text-xl font-bold"><Link href={`/blog/${post.slug}`} className="focus-ring rounded-sm hover:text-(--ui-violet)">{pick(post.title, locale)}</Link></h2>
      <p className="mt-3 flex-1 text-sm leading-7 text-(--ui-text-muted)">{pick(post.description, locale)}</p>
      <Link href={`/blog/${post.slug}`} aria-label={`${locale === 'ja' ? '読む' : 'Read'}: ${pick(post.title, locale)}`} className="focus-ring mt-6 inline-flex items-center rounded-sm text-sm font-bold text-(--ui-violet)">{locale === 'ja' ? '記事を読む' : 'Read article'}<ArrowRight className="ml-2" size={15} aria-hidden="true" /></Link>
    </article>)}</div>
    <p className="mt-10 text-sm text-(--ui-text-muted)">{locale === 'ja' ? '製品の最新情報はこちら。' : 'Looking for product updates?'} <Link href="/changelog" className="focus-ring rounded-sm font-bold text-(--ui-violet)">{locale === 'ja' ? '更新履歴を見る' : 'Read the changelog'}</Link></p>
  </div>;
}
