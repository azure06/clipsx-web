import { ClipboardList, Search, Cpu, CircleCheck } from 'lucide-react';
import Image from 'next/image';
import type { BlogFlow, BlogImage, BlogTable, BlogRewriteExample } from '@/content/blog';
import { pick } from '@/content/marketing';
import type { Locale } from '@/i18n/config';
import styles from './blog-visuals.module.css';

const icons = { clipboard: ClipboardList, search: Search, model: Cpu, check: CircleCheck };

export function BlogWorkflow({ flow, locale }: { flow: BlogFlow; locale: Locale }) {
  return <figure className="my-8 rounded-2xl border border-(--ui-border) bg-(--ui-surface) p-5 sm:p-7">
    <figcaption className="font-heading text-base font-semibold text-(--ui-text)">{pick(flow.caption, locale)}</figcaption>
    <ol className="mt-5 grid list-none gap-7 p-0 md:grid-cols-3 md:gap-6">
      {flow.steps.map((step, index) => {
        const Icon = icons[step.icon];
        return <li key={step.icon + index} className="relative flex min-w-0 gap-3 md:flex-col">
          <span style={{ animationDelay: `${index * 500}ms` }} className={`${styles.step} flex size-10 shrink-0 items-center justify-center rounded-xl bg-(--ui-accent-subtle) text-(--ui-violet)`}>
            <Icon size={21} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-(--ui-text)">{pick(step.title, locale)}</p>
            <p className="mt-1 text-sm leading-6 text-(--ui-text-muted)">{pick(step.detail, locale)}</p>
          </div>
          {index < flow.steps.length - 1 && <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="absolute -bottom-6 left-2 size-5 rotate-90 text-(--ui-text-muted) md:-right-5 md:top-2 md:left-auto md:rotate-0">
            <path d="M4 12h15m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>}
        </li>;
      })}
    </ol>
    <p className="mt-5 border-t border-(--ui-border) pt-4 text-xs leading-6 text-(--ui-text-muted)">{pick(flow.note, locale)}</p>
  </figure>;
}

export function BlogComparison({ table, locale }: { table: BlogTable; locale: Locale }) {
  return <div className="my-6 overflow-hidden rounded-xl border border-(--ui-border)">
    <table className="w-full table-fixed border-collapse text-left text-xs leading-6 sm:text-sm">
      <caption className="bg-(--ui-surface) px-3 py-3 text-left font-semibold text-(--ui-text) sm:px-4">{pick(table.caption, locale)}</caption>
      <thead className="bg-(--ui-accent-subtle)">
        <tr>{table.headers.map((header, index) => <th key={index} scope="col" className="border-t border-(--ui-border) px-3 py-3 align-top font-semibold wrap-anywhere sm:px-4">{pick(header, locale)}</th>)}</tr>
      </thead>
      <tbody>{table.rows.map((row, index) => <tr key={index}>
        {row.map((cell, column) => column === 0
          ? <th key={column} scope="row" className="border-t border-(--ui-border) px-3 py-3 align-top font-medium wrap-anywhere text-(--ui-text) sm:px-4">{pick(cell, locale)}</th>
          : <td key={column} className="border-t border-(--ui-border) px-3 py-3 align-top wrap-anywhere text-(--ui-text-muted) sm:px-4">{pick(cell, locale)}</td>)}
      </tr>)}</tbody>
    </table>
  </div>;
}

export function BlogBeforeAfter({ example, locale }: { example: BlogRewriteExample; locale: Locale }) {
  return <figure className="my-7 overflow-hidden rounded-2xl border border-(--ui-border)">
    <figcaption className="bg-(--ui-surface) px-5 py-4 text-sm font-semibold">{pick(example.caption, locale)}</figcaption>
    <div className="grid md:grid-cols-2">
      <div className="border-t border-(--ui-border) p-5 sm:p-6">
        <p className="eyebrow">{locale === 'ja' ? '原文（英語）' : 'Original'}</p>
        <blockquote lang="en" className="mt-4 text-base leading-8 text-(--ui-text-muted)">{pick(example.before, locale)}</blockquote>
      </div>
      <div className="border-t border-(--ui-border) bg-(--ui-accent-subtle) p-5 sm:p-6 md:border-l">
        <p className="eyebrow">{locale === 'ja' ? 'ローカルモデルの実際の出力（英語）' : 'Actual local-model suggestion'}</p>
        <blockquote lang="en" className="mt-4 text-base leading-8">{pick(example.after, locale)}</blockquote>
      </div>
    </div>
    <p className="border-t border-(--ui-border) px-5 py-4 text-sm leading-7 text-(--ui-text-muted)">{pick(example.note, locale)}</p>
  </figure>;
}

export function BlogFigure({ image, locale }: { image: BlogImage; locale: Locale }) {
  return <figure className="my-7">
    <a href={image.src} className="focus-ring block overflow-hidden rounded-2xl border border-(--ui-border)" aria-label={locale === 'ja' ? '画像を原寸で開く' : 'Open the full-size image'}>
      <Image src={image.src} alt={pick(image.alt, locale)} width={image.width} height={image.height}
        sizes="(min-width: 800px) 768px, 100vw" className="h-auto w-full" />
    </a>
    <figcaption className="mt-3 text-sm leading-6 text-(--ui-text-muted)">{pick(image.caption, locale)}</figcaption>
  </figure>;
}
