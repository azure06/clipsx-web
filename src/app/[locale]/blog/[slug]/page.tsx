import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { blogPosts } from '@/content/blog';
import { pick } from '@/content/marketing';
import { locales, type Locale } from '@/i18n/config';
import { Link } from '@/i18n/routing';
import { siteConfig } from '@/config/site';
import { jsonLd, localizedUrl, pageMetadata } from '@/lib/seo';

export function generateStaticParams() {
  return locales.flatMap(locale => blogPosts.map(post => ({ locale, slug: post.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = blogPosts.find(post => post.slug === slug);
  if (!post) notFound();
  const metadata = pageMetadata(locale, `/blog/${slug}`, pick(post.title, locale), pick(post.description, locale));
  return { ...metadata, openGraph: { ...metadata.openGraph, type: 'article', publishedTime: post.date, authors: ['ClipsX'] } };
}

export default async function Article({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const post = blogPosts.find(post => post.slug === slug);
  if (!post) notFound();
  const url = localizedUrl(locale, `/blog/${slug}`);
  const schema = {
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: pick(post.title, locale), description: pick(post.description, locale),
    datePublished: post.date, inLanguage: locale, mainEntityOfPage: url,
    author: { '@type': 'Organization', name: 'ClipsX', url: siteConfig.url },
    publisher: { '@type': 'Organization', name: 'ClipsX', url: siteConfig.url },
    image: `${siteConfig.url}${siteConfig.ogImage}`,
  };
  return <article className="marketing-shell py-20">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
    <div className="mx-auto max-w-3xl">
      <nav aria-label={locale === 'ja' ? 'パンくずリスト' : 'Breadcrumb'} className="mb-8 text-sm text-(--ui-text-muted)"><Link href="/" className="focus-ring rounded-sm hover:text-(--ui-violet)">ClipsX</Link><span aria-hidden="true"> / </span><Link href="/blog" className="focus-ring rounded-sm hover:text-(--ui-violet)">{locale === 'ja' ? 'ブログ' : 'Blog'}</Link></nav>
      <p className="eyebrow text-(--ui-violet)">ClipsX · <time dateTime={post.date}>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(post.date))}</time> · {locale === 'ja' ? `約 ${post.readMinutes} 分` : `${post.readMinutes} min read`}</p>
      <h1 className="mt-5 font-heading text-4xl font-bold tracking-tight sm:text-6xl">{pick(post.title, locale)}</h1>
      <p className="mt-6 text-xl leading-8 text-(--ui-text-muted)">{pick(post.description, locale)}</p>
      <div className="prose-clipsx mt-12 border-t border-(--ui-border) pt-2">{post.sections.map(section => <section key={section.title.en}><h2>{pick(section.title, locale)}</h2><p className="mt-4">{pick(section.body, locale)}</p></section>)}</div>
      <aside className="mt-12 border-t border-(--ui-border) pt-8">
        <h2 className="font-heading text-2xl font-bold">{locale === 'ja' ? 'ClipsX を使ってみる。' : 'Put it to work with ClipsX.'}</h2>
        <p className="mt-3 leading-7 text-(--ui-text-muted)">{locale === 'ja' ? '無料で、アカウントなしで始められます。履歴は自分の端末に保存されます。' : 'Start free, without an account. Your clipboard history stays on your device.'}</p>
        <div className="mt-5 flex flex-wrap gap-3"><Link href="/download" className="button-primary px-5 py-3">{locale === 'ja' ? 'ClipsX をダウンロード' : 'Download ClipsX'}</Link><Link href="/blog" className="button-secondary px-5 py-3">{locale === 'ja' ? 'すべての記事' : 'All articles'}</Link></div>
      </aside>
    </div>
  </article>;
}
