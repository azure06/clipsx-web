import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { MeaningSearchGuide } from "@/components/marketing/MeaningSearchGuide";
import type { Locale } from "@/i18n/config";
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/meaning-search', locale === 'ja' ? '意味検索' : 'Meaning Search',
      locale === "ja"
        ? "ClipsX の任意のローカル意味検索が、完全一致だけでなく内容の意味からクリップを見つける仕組み。"
        : "How ClipsX uses optional local semantic retrieval to find clips by concept, not only exact words.",
  );
}

export default async function MeaningSearchPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <MeaningSearchGuide locale={locale} />;
}
