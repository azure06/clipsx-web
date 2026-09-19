import type { Metadata } from "next";
import {
  ArrowRight,
  Blocks,
  Check,
  Code2,
  ExternalLink,
  Eye,
  Fingerprint,
  LockKeyhole,
  MousePointer2,
  PackageCheck,
  ScanSearch,
  ShieldCheck,
  Shuffle,
} from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { ExtensionWorkbench } from "@/components/marketing/ExtensionWorkbench";
import type { Locale } from "@/i18n/config";
import { documentationConfig } from "@/config/site";
import "./extensions.css";

const content = {
  en: {
    eyebrow: "EXTENSIONS FOR THE CLIPBOARD",
    title: "Copy is only the beginning.",
    intro:
      "Extensions recognize what you copied and put the right view or action where you need it—inside ClipsX, beside the original.",
    explore: "Explore what they do",
    build: "Build an extension",
    sample: "Interactive example",
    sampleNote: "Choose an extension to see where it fits.",
    waysLabel: "ONE CLIP. MORE USEFUL WAYS FORWARD.",
    waysTitle: "They meet your content where it is.",
    waysBody:
      "An extension can contribute one focused capability or a complete workflow. ClipsX decides when it applies and keeps the original clip intact.",
    ways: [
      [
        "Recognize",
        "Detect a URL, token, diagram, or structured value and attach useful context.",
      ],
      [
        "Present",
        "Add a compact badge or a full detail view that follows the app theme.",
      ],
      [
        "Transform",
        "Create a temporary result you can inspect before saving or copying it.",
      ],
      [
        "Act",
        "Place a relevant command in the preview toolbar or Actions menu.",
      ],
    ],
    catalogLabel: "START WITH THE FIRST-PARTY COLLECTION",
    catalogTitle: "Useful on purpose.",
    catalogBody:
      "Each package solves a recognizable clipboard task. Nothing is installed by default, so you choose what belongs in your workflow.",
    catalog: [
      [
        "Mermaid",
        "Turn standalone Mermaid or a diagram inside Markdown into a navigable, theme-aware preview.",
        "Offline renderer",
        "diagram",
      ],
      [
        "JWT Inspector",
        "Read headers and claims locally while keeping one crucial distinction clear: decoded does not mean verified.",
        "Local inspector",
        "token",
      ],
      [
        "Base64",
        "Recognize encoded values, inspect their metadata, then encode or decode deliberately.",
        "Local transform",
        "base64",
      ],
      [
        "Data Tools",
        "Move between tables, structured data, TypeScript shapes, URLs, and the formats ClipsX already understands.",
        "Format toolkit",
        "data",
      ],
      [
        "Ask AI",
        "Send only the selected, bounded text to ChatGPT or Claude after explicit approval.",
        "External action",
        "ai",
      ],
    ],
    availability: "Prepared for the signed catalog",
    availabilityBody:
      "The packages and registry release still need to be published. ClipsX will show reviewed releases in Discover once that deployment is complete.",
    trustLabel: "CLEAR AT THE MOMENT IT MATTERS",
    trustTitle: "See the boundary before you say yes.",
    trustBody:
      "Install, update, and first-use screens show what a package can access. Permission grants belong to one exact release and are revoked when its checksum changes.",
    trustItems: [
      [
        "Reviewed source",
        "Registry entries pin an exact version and SHA-256 checksum.",
      ],
      [
        "No ambient access",
        "Extensions cannot browse your history, files, or network on their own.",
      ],
      [
        "Permission changes surface",
        "An update with different capabilities comes back to you for review.",
      ],
      [
        "Failures stay contained",
        "Repeated failures can quarantine a package without changing canonical clips.",
      ],
    ],
    usersTitle: "Looking to use extensions?",
    usersBody:
      "Learn how Discover, permissions, updates, and recovery work inside ClipsX.",
    usersLink: "Read the extension guide",
    devTitle: "Have a clipboard workflow in mind?",
    devBody:
      "Build against Extension API v2. Start from a manifest, add only the capabilities you need, validate with the package CLI, and run the conformance suite.",
    devLink: "Open developer docs",
    sourceLink: "Browse extension source",
    path: ["Manifest", "Contribution", "Validate", "Package"],
  },
  ja: {
    eyebrow: "クリップボードの拡張機能",
    title: "コピーは、始まりにすぎない。",
    intro:
      "拡張機能はコピーした内容を認識し、必要な表示や操作を元のクリップの隣に追加します。すべて ClipsX の中で完結します。",
    explore: "できることを見る",
    build: "拡張機能を作る",
    sample: "インタラクティブ例",
    sampleNote: "拡張機能を選ぶと、役割を確認できます。",
    waysLabel: "ひとつのクリップ。その先の選択肢。",
    waysTitle: "内容に合わせて、必要な機能だけ。",
    waysBody:
      "ひとつの機能だけでも、まとまったワークフローでも追加できます。適用する場面は ClipsX が判断し、元のクリップは変更しません。",
    ways: [
      [
        "認識",
        "URL、トークン、図、構造化データを検出し、役立つ情報を付けます。",
      ],
      ["表示", "アプリのテーマに沿ったバッジや詳細ビューを追加します。"],
      ["変換", "保存やコピーの前に確認できる、一時的な結果を作ります。"],
      ["操作", "関連するコマンドをプレビューやアクションメニューに置きます。"],
    ],
    catalogLabel: "公式コレクションから始める",
    catalogTitle: "用途が明確な、小さな道具。",
    catalogBody:
      "各パッケージは具体的なクリップボード作業を解決します。最初から導入されるものはなく、必要なものだけを選べます。",
    catalog: [
      [
        "Mermaid",
        "Mermaid 単体や Markdown 内の図を、テーマ対応の操作しやすいプレビューにします。",
        "オフライン表示",
        "diagram",
      ],
      [
        "JWT Inspector",
        "ヘッダーとクレームをローカルで確認します。デコードと検証の違いも明確に示します。",
        "ローカル解析",
        "token",
      ],
      [
        "Base64",
        "エンコードされた値を認識し、情報を確認してから明示的に変換します。",
        "ローカル変換",
        "base64",
      ],
      [
        "Data Tools",
        "表、構造化データ、TypeScript 型、URL と ClipsX の対応形式を相互変換します。",
        "形式ツール",
        "data",
      ],
      [
        "Ask AI",
        "選択した範囲内のテキストだけを、明示的な許可後に ChatGPT または Claude へ送ります。",
        "外部アクション",
        "ai",
      ],
    ],
    availability: "署名カタログへの公開準備中",
    availabilityBody:
      "パッケージとレジストリのリリースは、まだ公開作業が必要です。完了後、審査済みリリースが ClipsX の「見つける」に表示されます。",
    trustLabel: "必要な瞬間に、境界を明確に",
    trustTitle: "許可する前に、アクセス範囲が分かる。",
    trustBody:
      "導入、更新、初回使用の画面で、パッケージが使う権限を確認できます。許可はひとつの正確なリリースに結びつき、チェックサム変更時に失効します。",
    trustItems: [
      [
        "審査可能な配布",
        "レジストリは正確なバージョンと SHA-256 を固定します。",
      ],
      [
        "包括的なアクセスなし",
        "履歴、ファイル、ネットワークを自由に参照できません。",
      ],
      ["権限変更を再確認", "機能が変わる更新は、もう一度確認を求めます。"],
      [
        "障害を隔離",
        "問題の続くパッケージを隔離しても、元のクリップは変わりません。",
      ],
    ],
    usersTitle: "拡張機能を使いたい方へ",
    usersBody: "ClipsX 内での検索、権限、更新、復旧の仕組みを説明します。",
    usersLink: "拡張機能ガイドを読む",
    devTitle: "クリップボードで実現したいことがありますか？",
    devBody:
      "Extension API v2 に沿って構築できます。マニフェストから始め、必要な機能だけを宣言し、CLI と適合テストで検証します。",
    devLink: "開発者ドキュメント",
    sourceLink: "拡張機能のソース",
    path: ["マニフェスト", "機能を追加", "検証", "パッケージ"],
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "ja" ? "拡張機能" : "Extensions",
    description: content[locale].intro,
  };
}

export default async function ExtensionsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = content[locale];
  const wayIcons = [ScanSearch, Eye, Shuffle, MousePointer2];
  return (
    <main className="ex-page">
      <section className="ex-hero ex-shell">
        <div className="ex-hero-copy">
          <p className="ex-kicker">
            <Blocks size={14} />
            {c.eyebrow}
          </p>
          <h1>{c.title}</h1>
          <p className="ex-lede">{c.intro}</p>
          <div className="ex-actions">
            <a href="#collection" className="ex-button ex-button-primary">
              {c.explore}
              <ArrowRight size={16} />
            </a>
            <a
              href={documentationConfig.root}
              target="_blank"
              rel="noreferrer"
              className="ex-button ex-button-secondary"
            >
              {c.build}
              <Code2 size={16} />
            </a>
          </div>
        </div>
        <div className="ex-hero-demo">
          <div className="ex-demo-label">
            <span>{c.sample}</span>
            <small>{c.sampleNote}</small>
          </div>
          <ExtensionWorkbench locale={locale} />
        </div>
      </section>
      <section className="ex-ways ex-shell">
        <div className="ex-section-intro">
          <p className="ex-kicker">{c.waysLabel}</p>
          <h2>{c.waysTitle}</h2>
          <p>{c.waysBody}</p>
        </div>
        <div className="ex-way-track">
          {c.ways.map(([title, body], index) => {
            const Icon = wayIcons[index];
            return (
              <article className="ex-way" key={title}>
                <div className="ex-way-top">
                  <Icon size={18} />
                  <span>0{index + 1}</span>
                </div>
                <h3>{title}</h3>
                <p>{body}</p>
                {index < c.ways.length - 1 && (
                  <ArrowRight className="ex-way-arrow" size={17} />
                )}
              </article>
            );
          })}
        </div>
      </section>
      <section className="ex-catalog" id="collection">
        <div className="ex-shell">
          <div className="ex-catalog-head">
            <div>
              <p className="ex-kicker">{c.catalogLabel}</p>
              <h2>{c.catalogTitle}</h2>
            </div>
            <p>{c.catalogBody}</p>
          </div>
          <div className="ex-package-grid">
            {c.catalog.map(([name, body, kind, tone], index) => (
              <article className={`ex-package ex-package-${tone}`} key={name}>
                <div className="ex-package-index">0{index + 1}</div>
                <div className="ex-package-mark" aria-hidden="true">
                  {name === "JWT Inspector"
                    ? "{·}"
                    : name === "Data Tools"
                      ? "<>"
                      : name === "Ask AI"
                        ? "↗"
                        : name.slice(0, 1)}
                </div>
                <div>
                  <p className="ex-package-kind">{kind}</p>
                  <h3>{name}</h3>
                  <p>{body}</p>
                </div>
              </article>
            ))}
          </div>
          <aside className="ex-status">
            <span className="ex-status-dot" />
            <div>
              <strong>{c.availability}</strong>
              <p>{c.availabilityBody}</p>
            </div>
          </aside>
        </div>
      </section>
      <section className="ex-trust ex-shell">
        <div className="ex-trust-card">
          <div className="ex-trust-copy">
            <p className="ex-kicker">
              <ShieldCheck size={14} />
              {c.trustLabel}
            </p>
            <h2>{c.trustTitle}</h2>
            <p>{c.trustBody}</p>
          </div>
          <div className="ex-permission-window">
            <div className="ex-permission-head">
              <div className="ex-package-mark">M</div>
              <div>
                <strong>Mermaid</strong>
                <span>infiniti.mermaid · v1.0.1</span>
              </div>
              <PackageCheck size={18} />
            </div>
            <div className="ex-permission-row">
              <LockKeyhole size={16} />
              <span>
                {locale === "ja" ? "ネットワークアクセス" : "Network access"}
              </span>
              <b>{locale === "ja" ? "なし" : "None"}</b>
            </div>
            <div className="ex-permission-row">
              <Fingerprint size={16} />
              <span>SHA-256</span>
              <code>89d4…2ac1</code>
            </div>
            <div className="ex-permission-ok">
              <Check size={15} />
              {locale === "ja" ? "オフラインで表示します" : "Renders offline"}
            </div>
          </div>
        </div>
        <div className="ex-trust-list">
          {c.trustItems.map(([title, body]) => (
            <article key={title}>
              <Check size={15} />
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="ex-routes ex-shell">
        <a href={documentationConfig.extensions} target="_blank" rel="noreferrer" className="ex-route ex-route-user">
          <span className="ex-route-icon">
            <Eye size={20} />
          </span>
          <div>
            <p>{c.usersTitle}</p>
            <h2>{c.usersBody}</h2>
            <span>
              {c.usersLink}
              <ArrowRight size={15} />
            </span>
          </div>
        </a>
        <div className="ex-route ex-route-dev">
          <span className="ex-route-icon">
            <Code2 size={20} />
          </span>
          <div>
            <p>{c.devTitle}</p>
            <h2>{c.devBody}</h2>
            <div className="ex-build-path">
              {c.path.map((step, index) => (
                <span key={step}>
                  {step}
                  {index < c.path.length - 1 && <ArrowRight size={12} />}
                </span>
              ))}
            </div>
            <div className="ex-route-links">
              <a href={documentationConfig.root} target="_blank" rel="noreferrer">
                {c.devLink}
                <ArrowRight size={15} />
              </a>
              <a
                href="https://github.com/azure06/clipsx-extensions"
                target="_blank"
                rel="noreferrer"
              >
                {c.sourceLink}
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
