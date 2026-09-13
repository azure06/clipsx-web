import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { docBodies, docs, pick, type DocSlug } from '@/content/marketing';
import { locales, type Locale } from '@/i18n/config';
const findDoc=(slug:string)=>docs.find((doc)=>doc.slug===slug);
export function generateStaticParams(){return locales.flatMap(locale=>docs.map(doc=>({locale,slug:doc.slug})))}
export async function generateMetadata({params}:{params:Promise<{locale:Locale;slug:string}>}):Promise<Metadata>{const {locale,slug}=await params;const doc=findDoc(slug);return doc?{title:pick(doc.title,locale),description:pick(doc.summary,locale)}:{title:'Not found'}}
export default async function DocPage({params}:{params:Promise<{locale:Locale;slug:string}>}){const {locale,slug}=await params;setRequestLocale(locale);const doc=findDoc(slug);const body=docBodies[slug as DocSlug];if(!doc||!body)notFound();return <div className="marketing-shell py-16"><div className="mx-auto max-w-3xl"><Link href="/docs" className="mb-10 inline-flex items-center text-sm text-slate-500 hover:text-cyan-600"><ArrowLeft className="mr-2" size={15}/>{locale==='ja'?'ドキュメント一覧':'All documentation'}</Link><p className="eyebrow text-cyan-700 dark:text-cyan-400">ClipsX docs</p><h1 className="mt-4 font-heading text-4xl font-black text-slate-950 sm:text-5xl dark:text-white">{pick(doc.title,locale)}</h1><p className="mt-5 text-lg text-slate-600 dark:text-slate-400">{pick(doc.summary,locale)}</p><article className="prose-clipsx mt-12 border-t border-black/5 pt-2 dark:border-white/5">{body.sections.map(section=><section key={pick(section.title,locale)}><h2>{pick(section.title,locale)}</h2>{section.paragraphs.map(paragraph=><p key={pick(paragraph,locale)} className="mt-4">{pick(paragraph,locale)}</p>)}</section>)}</article></div></div>}
