import type { Metadata } from 'next';
import { ArrowRight, BookOpen } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { PageIntro } from '@/components/marketing/Marketing';
import { docs, pick } from '@/content/marketing';
import type { Locale } from '@/i18n/config';
export const metadata:Metadata={title:'Docs',description:'Install, use, understand, and extend ClipsX.'};
export default async function Docs({params}:{params:Promise<{locale:Locale}>}){const {locale}=await params;setRequestLocale(locale);return <div className="marketing-shell pb-24"><PageIntro eyebrow={locale==='ja'?'ドキュメント':'Documentation'} title={locale==='ja'?'ClipsX を理解して使う。':'Understand it. Then make it yours.'} description={locale==='ja'?'導入からプライバシー、Ollama、拡張機能まで、現在実装されている動作を説明します。':'From first install to privacy, Ollama, and extensions—documentation for behavior that exists today.'}/><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{docs.map((doc)=><Link key={doc.slug} href={`/docs/${doc.slug}`} className="marketing-card group p-6"><BookOpen size={19} className="text-violet-600"/><h2 className="mt-5 font-heading text-lg font-bold text-slate-950 dark:text-white">{pick(doc.title,locale)}</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{pick(doc.summary,locale)}</p><span className="mt-5 inline-flex items-center text-sm font-bold text-violet-700 dark:text-violet-300">{locale==='ja'?'読む':'Read'}<ArrowRight className="ml-2 transition-transform group-hover:translate-x-1" size={15}/></span></Link>)}</div></div>}
