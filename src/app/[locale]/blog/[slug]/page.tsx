import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { blogPosts } from '@/content/blog';
import { pick } from '@/content/marketing';
import { BlogCard, BlogDate, BlogMeta, BlogResourceLink } from '@/components/marketing/Blog';
import { articleMetadata, articleSchema } from '@/lib/blog-seo';
import { jsonLd } from '@/lib/seo';
import type { Locale } from '@/i18n/config';

export function generateStaticParams() {
  return blogPosts.map(post => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = blogPosts.find(post => post.slug === slug);
  if (!post) notFound();
  return articleMetadata(post, locale);
}

export default async function Article({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const post = blogPosts.find(post => post.slug === slug);
  if (!post) notFound();
  const related = blogPosts.filter(candidate => candidate.slug !== slug);
  return <article className="marketing-shell py-12 sm:py-20">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(articleSchema(post, locale)) }} />
    <div className="mx-auto max-w-3xl">
      <nav aria-label={locale === 'ja' ? 'パンくずリスト' : 'Breadcrumb'} className="mb-8 text-sm text-(--ui-text-muted)">
        <Link href="/" className="focus-ring rounded-sm hover:text-(--ui-violet)">ClipsX</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/blog" className="focus-ring rounded-sm hover:text-(--ui-violet)">{locale === 'ja' ? 'ブログ' : 'Blog'}</Link>
      </nav>
      <BlogMeta post={post} locale={locale} />
      <h1 className="mt-5 font-heading text-3xl leading-tight font-bold tracking-tight sm:text-5xl">{pick(post.title, locale)}</h1>
      <p className="mt-6 text-lg leading-8 text-(--ui-text-muted) sm:text-xl">{pick(post.description, locale)}</p>
      <p className="mt-5 text-sm text-(--ui-text-muted)">
        {locale === 'ja' ? '執筆：ClipsX' : 'By ClipsX'}
        {post.modifiedDate && <> · {locale === 'ja' ? '更新：' : 'Updated '}<BlogDate date={post.modifiedDate} locale={locale} /></>}
      </p>
      <figure className="mt-8">
        <Image src={post.image.src} alt={pick(post.image.alt, locale)} width={post.image.width} height={post.image.height}
          sizes="(min-width: 800px) 768px, 100vw" className="h-auto w-full rounded-2xl border border-(--ui-border)" />
        <figcaption className="mt-3 text-xs leading-6 text-(--ui-text-muted)">{pick(post.image.caption, locale)}</figcaption>
      </figure>
      <aside aria-labelledby="takeaway" className="mt-8 rounded-xl border border-(--ui-border) bg-(--ui-accent-subtle) p-5 sm:p-6">
        <h2 id="takeaway" className="eyebrow">{locale === 'ja' ? 'この記事のポイント' : 'The takeaway'}</h2>
        <p className="mt-3 leading-8">{pick(post.takeaway, locale)}</p>
      </aside>
      <nav aria-label={locale === 'ja' ? 'この記事の目次' : 'On this page'} className="mt-8 border-y border-(--ui-border) py-6">
        <p className="eyebrow mb-3">{locale === 'ja' ? '目次' : 'On this page'}</p>
        <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">{post.sections.map(section => <li key={section.id}>
          <a href={`#${section.id}`} className="focus-ring inline-flex min-h-11 items-center rounded-sm text-sm leading-6 text-(--ui-text-muted) hover:text-(--ui-violet)">{pick(section.title, locale)}</a>
        </li>)}</ul>
      </nav>
      <div className="prose-clipsx mt-8 text-base sm:text-[17px]">
        {post.sections.map(section => <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-24">
          <h2 id={`${section.id}-title`}>{pick(section.title, locale)}</h2>
          {section.paragraphs.map((paragraph, index) => <p key={index} className="mt-5">{pick(paragraph, locale)}</p>)}
          {section.list && (section.list.ordered
            ? <ol className="my-5 list-decimal space-y-3 pl-6">{section.list.items.map((item, index) => <li key={index} className="pl-1">{pick(item, locale)}</li>)}</ol>
            : <ul className="space-y-3">{section.list.items.map((item, index) => <li key={index}>{pick(item, locale)}</li>)}</ul>)}
          {section.links?.map(resource => <div key={resource.href} className="mt-3"><BlogResourceLink resource={resource} locale={locale} /></div>)}
        </section>)}
      </div>
      <section aria-labelledby="resources" className="mt-12 border-t border-(--ui-border) pt-6">
        <h2 id="resources" className="eyebrow">{locale === 'ja' ? '参考リンクと次のステップ' : 'Sources & next steps'}</h2>
        <ul className="mt-3">{post.resources.map(resource => <li key={resource.href}><BlogResourceLink resource={resource} locale={locale} /></li>)}</ul>
      </section>
      <aside aria-labelledby="download-heading" className="mt-10 rounded-2xl border border-(--ui-border) bg-(--ui-surface) p-6 sm:p-8">
        <h2 id="download-heading" className="font-heading text-2xl font-bold">{locale === 'ja' ? 'ひとつのクリップから始めよう。' : 'Start with one useful clip.'}</h2>
        <p className="mt-3 leading-7 text-(--ui-text-muted)">{locale === 'ja' ? '無料で、アカウントなしで始められます。保存し、探し、もう一度使ってみてください。' : 'Start free, without an account. Save something, find it, and put it to work again.'}</p>
        <Link href="/download" className="focus-ring button-primary mt-5 min-h-11 px-5 py-3">{locale === 'ja' ? 'ClipsX をダウンロード' : 'Download ClipsX'}</Link>
      </aside>
    </div>
    <section aria-labelledby="related" className="mx-auto mt-16 max-w-5xl border-t border-(--ui-border) pt-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 id="related" className="font-heading text-2xl font-bold">{locale === 'ja' ? 'あわせて読みたい' : 'Keep exploring'}</h2>
        <Link href="/blog" className="focus-ring inline-flex min-h-11 items-center rounded-sm text-sm font-semibold text-(--ui-violet)">{locale === 'ja' ? 'すべての記事' : 'All articles'}</Link>
      </div>
      <div className="grid gap-6 md:grid-cols-2">{related.map(candidate => <BlogCard key={candidate.slug} post={candidate} locale={locale} />)}</div>
    </section>
  </article>;
}
