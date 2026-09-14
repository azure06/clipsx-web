import {
  ArrowDown,
  ArrowRight,
  Blocks,
  Code2,
  FileStack,
  Laptop,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/routing";
import { HomePreview } from "@/components/marketing/HomePreview";
import type { Locale } from "@/i18n/config";
import "./home.css";

const copy = {
  en: {
    eyebrow: "YOUR CLIPBOARD. MORE POSSIBILITIES.",
    title: "Copy something.",
    accent: "Do more with it.",
    intro:
      "The desktop clipboard for everything worth keeping — find that link, bring back an idea, and turn it into what's next.",
    download: "Get ClipsX",
    tour: "Take a closer look",
    noteItems: ["Free", "Local storage", "No account needed"],
    preview: "A little less searching. A lot more doing.",
    previewNote: "Interactive preview · Sample content",
    workflow: "PICK UP WHERE YOU LEFT OFF",
    heading: "Good things shouldn’t get lost\nbetween copy and paste.",
    steps: [
      [
        "Keep more than the last thing.",
        "Text, links, images, files, and tables. Keep the things you copy together, ready for the moment you need them.",
      ],
      [
        "Find the thing you almost remember.",
        "Search your history by text. Add optional Meaning Search with Ollama to find clips by what they mean.",
      ],
      [
        "Make the next step your own.",
        "Preview content, choose the format you need, or use an extension to turn a clip into something useful.",
      ],
    ],
    extensionsLabel: "SMALL EXTENSIONS. BIG LEVERAGE.",
    extensions: "Your clipboard,\nwith a few superpowers.",
    extensionsBody:
      "A diagram hiding in some text. A token that needs a closer look. Extensions give the things you copy a more useful next step.",
    extensionsLink: "Explore extensions",
    diagram: "From text to diagram",
    token: "A closer look at a JWT",
    developer: "Have a workflow in mind?",
    developerBody: "Build a WASM extension and make ClipsX work your way.",
    developerLink: "Start building",
    localLabel: "RIGHT HERE, ON YOUR COMPUTER",
    local: "Your work stays\nin your hands.",
    localBody:
      "Clipboard history lives on your device. Use ClipsX without an account. When you want local intelligence, connect your own Ollama setup.",
    localLink: "How local storage works",
    localItems: [
      "Clipboard history stored locally",
      "Optional intelligence with Ollama",
      "You choose which extensions to add",
    ],
    sync: "Signing in syncs selected settings and extension choices. It doesn’t sync clipboard history.",
    end: "Make room for your next idea.",
    endBody: "Give everything you copy a place to come back to.",
    docs: "Read the getting started guide",
  },
  ja: {
    eyebrow: "クリップボードに、もっと可能性を。",
    title: "コピーしたものを、",
    accent: "次のひらめきに。",
    intro:
      "残しておきたいもののための、デスクトップクリップボード。あのリンクも、ふと思いついたアイデアも。コピーしたものを見つけて、次の作業につなげよう。",
    download: "ClipsX を入手",
    tour: "使い方を見る",
    noteItems: ["無料", "端末に保存", "アカウント不要"],
    preview: "探す時間を減らして、やりたいことに集中。",
    previewNote: "操作できるプレビュー · サンプルデータ",
    workflow: "続きは、ここから。",
    heading: "コピーと貼り付けの間で、\n大切なものをなくさない。",
    steps: [
      [
        "最後のひとつだけじゃない。",
        "テキスト、リンク、画像、ファイル、表。コピーしたものをまとめて保存し、必要なときに取り出せます。",
      ],
      [
        "うろ覚えでも、見つかる。",
        "履歴をテキストで検索。Ollama による意味検索を追加すれば、内容の意味からも探せます。",
      ],
      [
        "次の一手を、自分らしく。",
        "内容をプレビューして、必要な形式を選択。拡張機能で、コピーしたものをもっと使いやすく。",
      ],
    ],
    extensionsLabel: "小さなツールで、できることが広がる。",
    extensions: "クリップボードに、\nちょっとした特技を。",
    extensionsBody:
      "テキストから図を表示したり、トークンの中身を確認したり。拡張機能が、コピーしたものの新しい使い道を広げます。",
    extensionsLink: "拡張機能を見る",
    diagram: "テキストから図へ",
    token: "JWT の中身を確認",
    developer: "作りたいワークフローがある？",
    developerBody: "WASM 拡張機能で、ClipsX を自分の道具に。",
    developerLink: "開発を始める",
    localLabel: "あなたのコンピューターで。",
    local: "自分のデータは、\n自分の手元に。",
    localBody:
      "クリップボードの履歴は端末内に保存。アカウントなしで使えます。ローカル AI を使いたいときは、自分の Ollama に接続できます。",
    localLink: "ローカル保存について",
    localItems: [
      "クリップボード履歴は端末内に保存",
      "Ollama による任意のローカル AI",
      "追加する拡張機能は自分で選択",
    ],
    sync: "サインインで同期するのは一部の設定と拡張機能の選択情報です。クリップボード履歴は同期しません。",
    end: "次のアイデアが、待っている。",
    endBody: "コピーしたものに、いつでも戻れる場所を。",
    docs: "スタートガイドを読む",
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: {
      absolute:
        locale === "ja"
          ? "ClipsX — コピーしたものを、次のひらめきに。"
          : "ClipsX — Your clipboard, more possibilities.",
    },
    description: copy[locale].intro,
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = copy[locale];
  const icons = [FileStack, Search, Blocks];
  return (
    <div className="cx-home">
      <section className="cx-hero">
        <div className="cx-shell cx-hero-copy">
          <p className="cx-kicker">
            <span className="cx-kicker-dot" />
            {c.eyebrow}
          </p>
          <h1>
            {c.title}
            <br />
            <span>{c.accent}</span>
          </h1>
          <p className="cx-intro">{c.intro}</p>
          <div className="cx-actions">
            <Link href="/download" className="cx-button">
              {c.download}
              <ArrowRight size={18} />
            </Link>
            <a href="#closer-look" className="cx-text-link">
              {c.tour}
              <ArrowDown size={16} />
            </a>
          </div>
          <div className="cx-hero-badges">
            {c.noteItems.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
        <div className="cx-shell cx-product-stage" id="closer-look">
          <div className="cx-stage-caption">
            <span>{c.preview}</span>
            <span>{c.previewNote}</span>
          </div>
          <HomePreview locale={locale} />
        </div>
      </section>
      <section className="cx-shell cx-workflow">
        <p className="cx-kicker">
          <span className="cx-kicker-index" aria-hidden="true">01</span>
          {c.workflow}
        </p>
        <h2>{c.heading}</h2>
        <div className="cx-benefits">
          {c.steps.map(([title, body], i) => {
            const Icon = icons[i];
            return (
              <article key={title} className={`cx-benefit-${i}`}>
                <span className="cx-benefit-index" aria-hidden="true">{`0${i + 1}`}</span>
                <div className="cx-feature-icon">
                  <Icon size={23} strokeWidth={1.6} />
                </div>
                <h3>{title}</h3>
                <p>{body}</p>
                {i === 0 && (
                  <div className="cx-capture-art" aria-hidden="true">
                    <span>
                      <FileStack size={19} />
                      notes.md
                    </span>
                    <span>
                      <Code2 size={19} />
                      {'{ "idea": "next" }'}
                    </span>
                    <span>
                      <Blocks size={19} />
                      diagram.mmd
                    </span>
                    <span>
                      <Laptop size={19} />
                      weekend.png
                    </span>
                  </div>
                )}
                {i === 1 && (
                  <div className="cx-search-art" aria-hidden="true">
                    <Search size={17} />
                    <span>
                      {locale === "ja" ? "あの旅行のメモ" : "that note about the trip"}
                    </span>
                    <Sparkles size={15} />
                  </div>
                )}
                {i === 2 && (
                  <div className="cx-format-art" aria-hidden="true">
                    <span>Markdown</span>
                    <ArrowRight size={16} />
                    <span>Mermaid</span>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
      <section className="cx-shell cx-extensions">
        <div className="cx-extension-main">
          <div className="cx-extension-copy">
            <p className="cx-kicker">
              <span className="cx-kicker-index" aria-hidden="true">02</span>
              {c.extensionsLabel}
            </p>
            <h2>{c.extensions}</h2>
            <p>{c.extensionsBody}</p>
            <Link href="/extensions" className="cx-text-link">
              {c.extensionsLink}
              <ArrowRight size={17} />
            </Link>
          </div>
          <div className="cx-extension-visual" aria-label={c.diagram}>
            <div className="cx-code-card">
              <span>
                <Code2 size={14} />
                Mermaid
              </span>
              <pre>{"graph LR\n  Idea --> Copy\n  Copy --> Create"}</pre>
            </div>
            <div className="cx-render-card">
              <div className="cx-render-label">
                <Blocks size={15} />
                {c.diagram}
              </div>
              <div className="cx-diagram">
                <span>Idea</span>
                <ArrowRight />
                <span>Copy</span>
                <ArrowRight />
                <span>Create</span>
              </div>
              <div className="cx-render-bottom">
                <span>Mermaid</span>
                <span>SVG</span>
              </div>
            </div>
            <div className="cx-token-card">
              <span className="cx-token-symbol">{"{ }"}</span>
              <div>
                <strong>JWT</strong>
                <p>{c.token}</p>
              </div>
              <span className="cx-token-dots" aria-hidden="true">
                •••
              </span>
            </div>
          </div>
        </div>
        <div className="cx-developer-strip">
          <Code2 size={25} />
          <div>
            <h3>{c.developer}</h3>
            <p>{c.developerBody}</p>
          </div>
          <Link href="/developers" className="cx-text-link">
            {c.developerLink}
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>
      <section className="cx-shell cx-local">
        <div>
          <p className="cx-kicker">
            <span className="cx-kicker-index" aria-hidden="true">03</span>
            {c.localLabel}
          </p>
          <h2>{c.local}</h2>
          <p className="cx-local-body">{c.localBody}</p>
          <Link href="/docs/privacy" className="cx-text-link">
            {c.localLink}
            <ArrowRight size={17} />
          </Link>
        </div>
        <div className="cx-local-panel">
          <div className="cx-local-heading">
            <ShieldCheck size={25} />
            <span>ClipsX</span>
            <span className="cx-local-dot" />
          </div>
          {c.localItems.map((item, i) => {
            const Icon = [Laptop, Sparkles, Blocks][i];
            return (
              <div className="cx-local-row" key={item}>
                <Icon size={19} />
                <span>{item}</span>
              </div>
            );
          })}
          <p>{c.sync}</p>
        </div>
      </section>
      <section className="cx-closing">
        <div className="cx-shell">
          <h2>{c.end}</h2>
          <p>{c.endBody}</p>
          <div className="cx-actions">
            <Link href="/download" className="cx-button">
              {c.download}
              <ArrowRight size={18} />
            </Link>
            <Link href="/docs/getting-started" className="cx-text-link">
              {c.docs}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
