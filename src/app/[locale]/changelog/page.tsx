import type { Metadata } from 'next';
import { ArrowUpRight, BookOpen, History, PackageCheck } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { siteConfig } from '@/config/site';
import type { Locale } from '@/i18n/config';

const content = {
  en: { title: 'Changelog', description: 'Verified ClipsX release notes, without promises ahead of the artifacts.', eyebrow: 'Release history', empty: 'No verified public releases yet.', body: 'ClipsX release notes will appear here after a build is certified and published through GitHub Releases. Until then, the Download page is the source of truth for availability.', release: 'Check GitHub Releases', download: 'Check download status', blog: 'Read development stories', ledger: ['Version and release date', 'What changed for users', 'Known limitations', 'Verified download route'] },
  ja: { title: '更新履歴', description: '公開済みの成果物に基づく、確認済みの ClipsX リリースノート。', eyebrow: 'リリース履歴', empty: '確認済みの公開リリースはまだありません。', body: 'ビルドの検証が完了し、GitHub Releases で公開された後にリリースノートを掲載します。それまでは、ダウンロードページを提供状況の正とします。', release: 'GitHub Releases を確認', download: 'ダウンロード状況を確認', blog: '開発ストーリーを読む', ledger: ['バージョンと公開日', 'ユーザー向けの変更点', '既知の制限', '確認済みダウンロード先'] },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> { const { locale } = await params; return { title: content[locale].title, description: content[locale].description }; }

export default async function ChangelogPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params; setRequestLocale(locale); const c = content[locale];
  return <main className="marketing-shell pb-24 pt-28">
    <header className="grid gap-10 border-b border-black/8 pb-16 lg:grid-cols-[1fr_.65fr] lg:items-end dark:border-white/8">
      <div><p className="eyebrow mb-5 text-violet-700 dark:text-violet-300">{c.eyebrow}</p><h1 className="max-w-3xl font-heading text-5xl font-black tracking-[-.055em] text-slate-950 sm:text-7xl dark:text-white">{c.title}</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-400">{c.description}</p></div>
      <div className="grid grid-cols-2 border-l border-t border-black/8 dark:border-white/8">{c.ledger.map((item, index) => <div key={item} className="min-h-24 border-b border-r border-black/8 p-4 dark:border-white/8"><span className="font-mono text-[10px] text-violet-600 dark:text-violet-300">0{index + 1}</span><p className="mt-3 font-heading text-xs font-bold text-slate-700 dark:text-slate-300">{item}</p></div>)}</div>
    </header>
    <section className="grid gap-10 py-20 lg:grid-cols-[.6fr_1fr]">
      <div><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300"><History size={20}/></div><p className="mt-5 font-mono text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Waiting for release 01</p></div>
      <div className="max-w-2xl"><h2 className="font-heading text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">{c.empty}</h2><p className="mt-5 text-base leading-8 text-slate-600 dark:text-slate-400">{c.body}</p><div className="mt-8 flex flex-wrap gap-3"><a href={siteConfig.releases} target="_blank" rel="noreferrer" className="button-primary gap-2 px-5 py-3">{c.release}<ArrowUpRight size={15}/></a><Link href="/download" className="button-secondary gap-2 px-5 py-3"><PackageCheck size={15}/>{c.download}</Link><Link href="/blog" className="button-secondary gap-2 px-5 py-3"><BookOpen size={15}/>{c.blog}</Link></div></div>
    </section>
  </main>;
}
