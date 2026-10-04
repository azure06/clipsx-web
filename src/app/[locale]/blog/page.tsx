import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { PageIntro } from '@/components/marketing/Marketing';
import { BlogCard } from '@/components/marketing/Blog';
import { blogPosts } from '@/content/blog';
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
    <BlogCard post={blogPosts[0]} locale={locale} featured />
    <section aria-labelledby="more-articles" className="mt-12">
      <h2 id="more-articles" className="mb-6 font-heading text-2xl font-bold">{locale === 'ja' ? 'ほかの記事' : 'More to explore'}</h2>
      <div className="grid gap-6 md:grid-cols-2">{blogPosts.slice(1).map(post => <BlogCard key={post.slug} post={post} locale={locale} />)}</div>
    </section>
    <p className="mt-10 text-sm text-(--ui-text-muted)">{locale === 'ja' ? '製品の最新情報はこちら。' : 'Looking for product updates?'} <Link href="/changelog" className="focus-ring rounded-sm font-bold text-(--ui-violet)">{locale === 'ja' ? '更新履歴を見る' : 'Read the changelog'}</Link></p>
  </div>;
}
