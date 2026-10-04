import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/routing';
import type { Locale } from '@/i18n/config';
import { readingMinutes, type BlogLink, type BlogPost } from '@/content/blog';
import { pick } from '@/content/marketing';

export function BlogDate({ date, locale }: { date: string; locale: Locale }) {
  return <time dateTime={date}>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(date))}</time>;
}

export function BlogMeta({ post, locale }: { post: BlogPost; locale: Locale }) {
  const minutes = readingMinutes(post, locale);
  return <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-6 text-(--ui-text-muted)">
    <span>{pick(post.topic, locale)}</span><span aria-hidden="true">·</span>
    <BlogDate date={post.date} locale={locale} /><span aria-hidden="true">·</span>
    <span>{locale === 'ja' ? `約 ${minutes} 分` : `${minutes} min read`}</span>
  </p>;
}

export function BlogCard({ post, locale, featured = false }: { post: BlogPost; locale: Locale; featured?: boolean }) {
  return <article className={`marketing-card overflow-hidden ${featured ? 'grid lg:grid-cols-2' : 'flex flex-col'}`}>
    <div className={`bg-[#f6f8fc] ${featured ? 'flex items-center' : ''}`}>
      <Image src={post.image.src} width={post.image.width} height={post.image.height} alt={pick(post.image.alt, locale)}
        sizes={featured ? '(min-width: 1280px) 624px, (min-width: 1024px) 50vw, 100vw' : '(min-width: 1280px) 624px, (min-width: 768px) 50vw, 100vw'}
        preload={featured} className="h-auto w-full" />
    </div>
    <div className={`flex flex-1 flex-col ${featured ? 'justify-center p-6 sm:p-10 lg:p-12' : 'p-6 sm:p-8'}`}>
      {featured && <p className="eyebrow mb-4">{locale === 'ja' ? '最新の記事' : 'Latest article'}</p>}
      <BlogMeta post={post} locale={locale} />
      <h2 className={`mt-4 font-heading font-bold tracking-tight ${featured ? 'text-2xl sm:text-3xl' : 'text-2xl'}`}>
        <Link href={`/blog/${post.slug}`} className="focus-ring rounded-sm transition-colors hover:text-(--ui-violet)">{pick(post.title, locale)}</Link>
      </h2>
      <p className="mt-4 leading-7 text-(--ui-text-muted)">{pick(post.description, locale)}</p>
      <Link href={`/blog/${post.slug}`} aria-label={`${locale === 'ja' ? '記事を読む' : 'Read article'}: ${pick(post.title, locale)}`}
        className="focus-ring mt-6 inline-flex min-h-11 w-fit items-center gap-2 rounded-md text-sm font-bold text-(--ui-violet)">
        {locale === 'ja' ? '記事を読む' : 'Read article'}<ArrowRight size={16} aria-hidden="true" />
      </Link>
    </div>
  </article>;
}

export function BlogResourceLink({ resource, locale }: { resource: BlogLink; locale: Locale }) {
  const className = 'focus-ring inline-flex min-h-11 items-center rounded-sm text-sm font-semibold text-(--ui-violet) underline decoration-(--ui-border-strong) underline-offset-4 hover:decoration-current';
  return resource.href.startsWith('/')
    ? <Link href={resource.href} className={className}>{pick(resource.label, locale)}</Link>
    : <a href={resource.href} className={className}>{pick(resource.label, locale)}</a>;
}
