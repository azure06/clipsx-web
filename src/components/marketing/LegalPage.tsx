import { Link } from '@/i18n/routing';
import type { Locale } from '@/i18n/config';
import { legalContact, legalReview, type LegalDocument } from '@/content/legal';

export function LegalPage({ locale, document, kind }: {
  locale: Locale;
  document: LegalDocument;
  kind: 'privacy' | 'terms';
}) {
  const ja = locale === 'ja';
  const effectiveDate = new Intl.DateTimeFormat(ja ? 'ja-JP' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${legalReview.effectiveDate}T00:00:00Z`));

  return (
    <article className="marketing-shell py-16 pb-24 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow text-violet-700 dark:text-violet-300">{ja ? 'ClipsX の利用について' : 'Using ClipsX'}</p>
        <h1 className="mt-5 font-heading text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl dark:text-white">{document.title}</h1>
        <p className="mt-5 text-base leading-8 text-slate-600 dark:text-slate-400">{document.summary}</p>
        <div className="mt-6 space-y-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          <p>{ja ? '適用開始日：' : 'Effective date: '}<time dateTime={legalReview.effectiveDate}>{effectiveDate}</time></p>
        </div>
        <nav aria-label={ja ? 'ページ内の項目' : 'On this page'} className="mt-10 border-y border-black/10 py-6 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{ja ? '目次' : 'On this page'}</p>
          <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {document.sections.map(section => (
              <li key={section.id}><a href={`#${section.id}`} className="focus-ring inline-flex min-h-8 items-center rounded-sm text-sm text-slate-600 underline-offset-4 hover:text-violet-700 hover:underline dark:text-slate-400 dark:hover:text-violet-300">{section.title}</a></li>
            ))}
          </ul>
        </nav>
        <div className="mt-12 space-y-10">
          {document.sections.map(section => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`} className="scroll-mt-24">
              <h2 id={`${section.id}-heading`} className="font-heading text-xl font-semibold text-slate-950 dark:text-white">{section.title}</h2>
              {section.paragraphs.map(paragraph => <p key={paragraph} className="mt-4 text-[15px] leading-8 text-slate-600 dark:text-slate-400">{paragraph}</p>)}
              {section.links && <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-3">{section.links.map(link => <li key={link.href}><a href={link.href} target="_blank" rel="noreferrer" className="focus-ring rounded-sm text-sm text-violet-700 underline underline-offset-4 dark:text-violet-300">{link.label}</a></li>)}</ul>}
            </section>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-black/10 pt-6 text-sm dark:border-white/10">
          <a href={`mailto:${legalContact}`} className="focus-ring break-all rounded-sm text-violet-700 underline underline-offset-4 dark:text-violet-300">{legalContact}</a>
          <Link href={kind === 'privacy' ? '/terms' : '/privacy'} className="focus-ring rounded-sm text-slate-600 underline underline-offset-4 dark:text-slate-400">
            {kind === 'privacy' ? ja ? '利用規約' : 'Terms of use' : ja ? 'プライバシーポリシー' : 'Privacy policy'}
          </Link>
        </div>
      </div>
    </article>
  );
}
