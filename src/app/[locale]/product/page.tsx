import type { Metadata } from 'next';
import { Archive, FileSearch, Keyboard, ScanText, Share2, ShieldCheck } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { CtaBand, FeatureCard, PageIntro } from '@/components/marketing/Marketing';
import { pick, productCards } from '@/content/marketing';
import type { Locale } from '@/i18n/config';
export const metadata:Metadata={title:'Product',description:'Capture, find, understand, and transform rich clipboard content with ClipsX.'};
const intro={en:['Product','More than clipboard history.','ClipsX preserves useful representations, keeps retrieval fast, and gives every transformation an explicit boundary.'],ja:['製品','履歴だけではないクリップボード。','ClipsX は有用な表現を保持し、高速に再発見し、すべての変換に明確な境界を設けます。']} as const;
export default async function ProductPage({params}:{params:Promise<{locale:Locale}>}){ const {locale}=await params; setRequestLocale(locale); const c=intro[locale]; const icons=[Archive,FileSearch,ScanText,Keyboard,Share2,ShieldCheck]; return <><div className="marketing-shell"><PageIntro eyebrow={c[0]} title={c[1]} description={c[2]}/><div className="grid gap-5 pb-24 md:grid-cols-2 lg:grid-cols-3">{productCards.map((card,i)=><FeatureCard key={pick(card.title,locale)} icon={icons[i]} title={pick(card.title,locale)}>{pick(card.body,locale)}</FeatureCard>)}</div></div><CtaBand title={locale==='ja'?'ローカル製品は、すべて無料。':'The local product is free. Full stop.'} body={locale==='ja'?'有料プランを選ばなくても、ClipsX の基本機能を利用できます。':'Use the complete local ClipsX experience without choosing a paid plan.'} label={locale==='ja'?'ダウンロード状況を見る':'See download status'}/></>}
