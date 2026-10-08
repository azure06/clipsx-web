import type { Metadata } from "next";
import { Apple, ArrowUpRight, Clock3, Monitor, Terminal } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { snapStore, unavailableTargets } from "@/config/download";
import { getPublishedRelease } from "@/lib/releases";
import { connection } from "next/server";
import { getDocumentationConfig, siteConfig } from "@/config/site";
import { Link } from '@/i18n/routing';
import { pageMetadata } from '@/lib/seo';
import { PageIntro } from "@/components/marketing/Marketing";
import type { Locale } from "@/i18n/config";
export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/download', locale === 'ja' ? 'ClipsX をダウンロード' : 'Download ClipsX for Windows, macOS & Linux', text[locale].intro[2]);
}
const icons = { windows: Monitor, linux: Terminal, macos: Apple };
const text = {
  en: {
    intro: [
      "Download",
      "Your next copy starts here.",
      "Download the free clipboard manager for Windows, macOS, or Linux/X11. No account or subscription required.",
    ],
    available: "Download",
    soon: "Downloads unavailable",
    windows: "Windows",
    linux: "Linux",
    macos: "macOS",
    notice: "Downloads temporarily unavailable",
    noticeBody:
      "We could not verify the latest download list. Check the published release on GitHub for installers and platform details, or try this page again shortly.",
    releases: "Open GitHub Releases",
    verified: "Signed installer",
    published: "Published package",
    snapDescription: "Prefer Snap? View the available package and installation instructions in the Snap Store.",
    snapBadge: "Get it from the Snap Store",
    quickTitle: "From your first copy to your next paste.",
    steps: [['Install for your device', 'Choose your operating system and architecture above. For Linux, use AppImage or the Debian package on X11.'], ['Copy something', 'Copy text or a link from any app. Your clipboard history stays on your device.'], ['Find and reuse it', 'Open ClipsX with your configured shortcut, find the clip, and choose the representation to copy or paste.']],
    guide: "Open the setup guide",
    changelog: "Release notes",
    optional: "Start with ordinary clipboard history. Add local AI, extensions, or account sync whenever you need them.",
  },
  ja: {
    intro: [
      "ダウンロード",
      "次のコピーは、ここから。",
      "Windows、macOS、Linux/X11 向けの無料クリップボードマネージャー。アカウントもサブスクリプションも不要です。",
    ],
    available: "ダウンロード",
    soon: "現在ダウンロードできません",
    windows: "Windows",
    linux: "Linux",
    macos: "macOS",
    notice: "ダウンロードを一時的に利用できません",
    noticeBody:
      "最新のダウンロード一覧を確認できませんでした。GitHub の公開リリースでインストーラーと対応環境を確認するか、しばらくしてから再度お試しください。",
    releases: "GitHub Releases を開く",
    verified: "署名済みインストーラー",
    published: "公開済みパッケージ",
    snapDescription: "Snap を使う方は、Snap Store でパッケージとインストール手順を確認できます。",
    snapBadge: "Snap Store から入手",
    quickTitle: "最初のコピーから、次の貼り付けへ。",
    steps: [['端末に合わせてインストール', '上から OS とアーキテクチャを選択。Linux は X11 上で AppImage または Debian パッケージを利用できます。'], ['何かをコピー', 'アプリからテキストやリンクをコピーします。履歴は端末に保存されます。'], ['見つけて再利用', '設定したショートカットで ClipsX を開き、クリップを探して、コピーや貼り付けに使う形式を選びます。']],
    guide: "セットアップガイドを開く",
    changelog: "リリースノート",
    optional: "まずは通常の履歴から。ローカル AI、拡張機能、アカウント同期は必要なときに追加できます。",
  },
} as const;
export default async function Download({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const documentationConfig = getDocumentationConfig(locale);
  const c = text[locale];
  await connection();
  const release = await getPublishedRelease();
  const downloadTargets = release?.targets ?? unavailableTargets;
  const architectureLabel = (architecture: string) =>
    architecture === "arm64"
      ? "Apple Silicon"
      : architecture === "x64"
        ? "Intel / x64"
        : architecture;
  return (
    <div className="marketing-shell pb-24">
      <PageIntro
        eyebrow={release ? `${c.intro[0]} · v${release.version}` : c.intro[0]}
        title={c.intro[1]}
        description={c.intro[2]}
      />
      {!release && (
        <section className="mx-auto mb-10 max-w-3xl rounded-2xl border border-amber-500/20 bg-amber-50 p-7 dark:bg-amber-400/5">
          <h2 className="font-heading text-xl font-bold text-slate-950 dark:text-white">
            {c.notice}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
            {c.noticeBody}
          </p>
          <a
            className="mt-5 inline-flex items-center text-sm font-bold text-violet-700 dark:text-violet-300"
            href={siteConfig.releases}
            target="_blank"
            rel="noreferrer"
          >
            {c.releases}
            <ArrowUpRight className="ml-2" size={15} />
          </a>
        </section>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {downloadTargets.map((target) => {
          const Icon = icons[target.platform];
          const name = c[target.platform];
          return (
            <article
              className="marketing-card grid grid-cols-[auto_1fr] items-start gap-4 p-6 sm:grid-cols-[auto_1fr_auto] sm:items-center"
              key={target.id}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-300">
                <Icon size={23} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-heading font-bold text-slate-950 dark:text-white">
                  {name}{" "}
                  <span className="font-normal text-slate-400">
                    {target.platform === "macos"
                      ? architectureLabel(target.architecture)
                      : target.architecture}
                  </span>
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {target.format} ·{" "}
                  {target.status === "available"
                    ? target.signed || target.notarized
                      ? c.verified
                      : c.published
                    : c.soon}
                </p>
              </div>
              {target.status === "available" && target.url ? (
                <a
                  href={target.url}
                  aria-label={`${c.available} · ${name} ${architectureLabel(target.architecture)} · ${target.format}`}
                  className="button-primary col-span-2 px-4 py-2 text-sm sm:col-span-1"
                >
                  {c.available}
                </a>
              ) : (
                <span className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500 sm:col-span-1 dark:bg-white/5">
                  <Clock3 size={14} />
                  {c.soon}
                </span>
              )}
            </article>
          );
        })}
      </div>
      {snapStore.enabled && (
        <section aria-labelledby="snap-store-title" className="marketing-card mt-4 grid gap-5 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <h2 id="snap-store-title" className="font-heading font-bold text-slate-950 dark:text-white">Linux · Snap Store</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-(--ui-text-muted)">{c.snapDescription}</p>
          </div>
          <a href={snapStore.url} aria-label={c.snapBadge} className="inline-flex w-fit rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-500">
            {/* Official externally hosted store badges; fixed dimensions prevent layout shifts. */}
            {/* eslint-disable @next/next/no-img-element */}
            <img src="https://snapcraft.io/en/light/install.svg" alt={c.snapBadge} width={182} height={56} loading="lazy" className="block max-w-full dark:hidden" />
            <img src="https://snapcraft.io/en/dark/install.svg" alt={c.snapBadge} width={182} height={56} loading="lazy" className="hidden max-w-full dark:block" />
            {/* eslint-enable @next/next/no-img-element */}
          </a>
        </section>
      )}
      <section className="mt-16 border-t border-(--ui-border) pt-12">
        <h2 className="font-heading text-3xl font-bold tracking-tight">{c.quickTitle}</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {c.steps.map(([title, body], index) => <li key={title} className="marketing-card p-6"><span className="font-mono text-sm text-(--ui-violet)">0{index + 1}</span><h3 className="mt-4 font-heading text-lg font-bold">{title}</h3><p className="mt-3 text-sm leading-7 text-(--ui-text-muted)">{body}</p></li>)}
        </ol>
        <p className="mt-6 text-sm leading-7 text-(--ui-text-muted)">{c.optional}</p>
        <div className="mt-6 flex flex-wrap gap-3"><a href={documentationConfig.gettingStarted} className="button-secondary px-5 py-3">{c.guide}</a><Link href="/changelog" className="button-secondary px-5 py-3">{c.changelog}</Link></div>
      </section>

    </div>
  );
}
