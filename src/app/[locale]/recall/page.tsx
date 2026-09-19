import type { Metadata } from "next";
import {
  ArrowRight,
  BookOpen,
  Check,
  Cpu,
  FileText,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import type { Locale } from "@/i18n/config";
import { RecallEvidenceStory } from "@/components/marketing/RecallEvidenceStory";
import { documentationConfig } from "@/config/site";
import styles from "./recall.module.css";

const copy = {
  en: {
    metadata: [
      "Recall for ClipsX",
      "Ask questions across selected clipboard history and inspect the clips behind every answer.",
    ],
    hero: [
      "Recall",
      "Your history has context. Recall connects it.",
      "Ask a question across the history you choose. Recall uses your configured local model to answer with citations, so you can check the original clips behind the response.",
    ],
    try: "Explore an example",
    setup: "Set up local intelligence",
    proof: ["Explicit scope", "Visible evidence", "Local model"],
    distinction: [
      "Three ways back to what you copied.",
      "Use the simplest tool that fits the question. Recall does not replace exact search or Meaning Search.",
    ],
    tools: [
      [
        "Exact search",
        "Names, commands, paths, URLs, and phrases you remember.",
        "Matches literal text",
      ],
      [
        "Meaning Search",
        "Concepts and half-remembered wording across eligible history.",
        "Retrieves related clips",
      ],
      [
        "Recall",
        "A question that needs a synthesized answer with inspectable sources.",
        "Generates from evidence",
      ],
    ],
    process: [
      "Evidence before prose.",
      "Recall searches the active scope, prepares bounded passages, excludes detected secrets, and then asks your configured local generation model to answer. If Meaning Search is unavailable, retrieval can fall back to exact text evidence.",
    ],
    boundaries: [
      [
        "Your scope stays visible",
        "All, pinned, favorites, tags, formats, and enabled sources determine what Recall may inspect.",
      ],
      [
        "Sources remain attached",
        "Open a citation, inspect the excerpt, return to the original clip, or rerun with only selected evidence.",
      ],
      [
        "Temporary by design",
        "Recall sessions expire. Questions and answers do not become canonical clip metadata.",
      ],
      [
        "Generated, not guaranteed",
        "Answers can be incomplete or wrong. ClipsX labels the model and execution location so you can verify the result.",
      ],
    ],
    close: [
      "Ready to ask your own history?",
      "Connect Ollama, choose a generation-capable model, and let Recall work only with the scope you choose.",
      "Get ClipsX",
      "Read the Ollama guide",
    ],
  },
  ja: {
    metadata: [
      "ClipsX Recall",
      "選択したクリップボード履歴に質問し、回答の根拠となったクリップを確認できます。",
    ],
    hero: [
      "Recall",
      "履歴をつなげて、答えと根拠へ。",
      "Recall は、選択したクリップボード履歴を、設定したローカルモデルによる一時的な会話に変えます。まず根拠を検索し、参照元を表示したまま、生成文と原本を明確に分けます。",
    ],
    try: "例を試す",
    setup: "ローカルインテリジェンスを設定",
    proof: ["明示的な範囲", "確認できる根拠", "ローカルモデル"],
    distinction: [
      "コピーした情報に戻る、3つの方法。",
      "質問に合う最も単純な方法を選びます。Recall は完全一致検索や意味検索を置き換えません。",
    ],
    tools: [
      [
        "完全一致検索",
        "覚えている名前、コマンド、パス、URL、言い回し。",
        "文字列を照合",
      ],
      [
        "意味検索",
        "対象履歴から、概念や曖昧に覚えている表現を探す。",
        "関連クリップを取得",
      ],
      [
        "Recall",
        "複数の根拠から、参照元付きの回答が必要な質問。",
        "根拠から文章を生成",
      ],
    ],
    process: [
      "文章より先に、根拠を探す。",
      "Recall は現在の範囲を検索し、制限された文章断片を準備し、検出された秘密情報を除外してから、設定済みのローカル生成モデルに回答を求めます。意味検索が利用できない場合は、完全一致の根拠にフォールバックできます。",
    ],
    boundaries: [
      [
        "検索範囲を常に表示",
        "すべて、ピン、お気に入り、タグ、形式、有効なソースが Recall の確認範囲を決めます。",
      ],
      [
        "参照元を回答に保持",
        "引用を開き、抜粋を確認し、元のクリップへ戻り、選択した根拠だけで再実行できます。",
      ],
      [
        "一時的な会話",
        "Recall セッションには期限があります。質問と回答はクリップの原本情報にはなりません。",
      ],
      [
        "生成結果は保証ではない",
        "回答は不完全または誤っている可能性があります。モデルと実行場所を表示し、結果を確認できるようにします。",
      ],
    ],
    close: [
      "自分の履歴に質問してみませんか？",
      "Ollama に接続して文章生成対応モデルを選び、指定した範囲だけで Recall を使えます。",
      "ClipsX を入手",
      "Ollama ガイドを読む",
    ],
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: copy[locale].metadata[0],
    description: copy[locale].metadata[1],
  };
}

export default async function RecallPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = copy[locale];
  return (
    <div className={styles.page} lang={locale}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <Sparkles size={13} />
            {c.hero[0]}
          </p>
          <h1>{c.hero[1]}</h1>
          <p className={styles.lede}>{c.hero[2]}</p>
          <div className={styles.actions}>
            <a href="#evidence" className={styles.primary}>
              {c.try}
              <ArrowRight size={16} />
            </a>
            <a href={documentationConfig.localAi} target="_blank" rel="noreferrer" className={styles.secondary}>
              {c.setup}
              <BookOpen size={16} />
            </a>
          </div>
          <div className={styles.proof}>
            {c.proof.map((item) => (
              <span key={item}>
                <Check size={12} />
                {item}
              </span>
            ))}
          </div>
        </div>
        <figure className={styles.matchScene}>
          <div className={styles.sceneHeader}>
            <Sparkles size={15} />
            <span>Recall</span>
            <span className={styles.sceneBadge}>
              {locale === "ja" ? "回答の例" : "Example answer"}
            </span>
          </div>
          <p className={styles.sceneLabel}>
            {locale === "ja" ? "あなたの質問" : "Your question"}
          </p>
          <blockquote>
            {locale === "ja"
              ? "チームの集まりは、どこに決まった？"
              : "Where did we decide to meet?"}
          </blockquote>
          <div className={styles.matchResult}>
            <p>
              {locale === "ja"
                ? "木曜日の14時に喫茶 森で。2階には6人分の席があります。"
                : "Kissa Mori, Thursday at 2 pm. There’s room for six of us upstairs."}{" "}
              <a
                href="#evidence"
                className={styles.citation}
                aria-label={
                  locale === "ja"
                    ? "引用の例を見る"
                    : "Explore example citations"
                }
              >
                [1, 2]
              </a>
            </p>
          </div>
          <div className={styles.evidenceLinks}>
            <span>
              <FileText size={14} />
              {locale === "ja" ? "チームのメモ" : "Team notes"}
            </span>
            <span>
              <FileText size={14} />
              {locale === "ja" ? "カフェの詳細" : "Café details"}
            </span>
          </div>
          <figcaption>
            {locale === "ja"
              ? "保存した内容から回答へ。引用を開いて根拠を確認。"
              : "From saved fragments to an answer you can trace."}
          </figcaption>
        </figure>
      </section>
      <nav
        className={styles.sectionNav}
        aria-label={locale === "ja" ? "このページの内容" : "On this page"}
      >
        <a href="#evidence">
          {locale === "ja" ? "回答と根拠" : "Answer & evidence"}
          <ArrowRight size={12} />
        </a>
        <a href="#search-modes">
          {locale === "ja" ? "検索との違い" : "Compare search modes"}
          <ArrowRight size={12} />
        </a>
        <a href="#boundaries">
          {locale === "ja" ? "プライバシー" : "Privacy & control"}
          <ArrowRight size={12} />
        </a>
        <a href={documentationConfig.localAi} target="_blank" rel="noreferrer">
          {c.setup}
          <ArrowRight size={12} />
        </a>
      </nav>
      <section id="search-modes" className={styles.compare}>
        <div className={styles.sectionIntro}>
          <p>{locale === "ja" ? "検索を選ぶ" : "FIND OR ASK"}</p>
          <h2>{c.distinction[0]}</h2>
          <span>{c.distinction[1]}</span>
        </div>
        <div className={styles.toolRows}>
          {c.tools.map((tool, index) => {
            const Icon = [Search, Cpu, Sparkles][index];
            return (
              <article key={tool[0]}>
                <div>
                  <Icon size={18} />
                  {index === 1 ? (
                    <a
                      href={documentationConfig.localAi}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.modeLink}
                    >
                      {tool[0]}
                      <ArrowRight size={14} />
                    </a>
                  ) : (
                    <strong>{tool[0]}</strong>
                  )}
                </div>
                <p>{tool[1]}</p>
                <span>{tool[2]}</span>
              </article>
            );
          })}
        </div>
      </section>
      <section id="evidence" className={styles.evidence}>
        <div className={styles.sectionIntro}>
          <p>{locale === "ja" ? "回答と根拠" : "ANSWER & EVIDENCE"}</p>
          <h2>{c.process[0]}</h2>
          <span>{c.process[1]}</span>
        </div>
        <RecallEvidenceStory locale={locale} />
      </section>
      <section id="boundaries" className={styles.boundary}>
        <div className={styles.boundaryLead}>
          <ShieldCheck size={22} />
          <p>{locale === "ja" ? "プライバシーと操作" : "PRIVACY & CONTROL"}</p>
          <h2>
            {locale === "ja"
              ? "質問も範囲も、自分で選ぶ。"
              : "Your question. Your scope. Your device."}
          </h2>
        </div>
        <div className={styles.boundaryGrid}>
          {c.boundaries.map((item) => (
            <article key={item[0]}>
              <h3>{item[0]}</h3>
              <p>{item[1]}</p>
            </article>
          ))}
        </div>
      </section>
      <section className={styles.closing}>
        <div>
          <p>RECALL, LOCALLY</p>
          <h2>{c.close[0]}</h2>
          <span>{c.close[1]}</span>
        </div>
        <div>
          <Link href="/download" className={styles.primary}>
            {c.close[2]}
            <ArrowRight size={16} />
          </Link>
          <a href={documentationConfig.localAi} target="_blank" rel="noreferrer" className={styles.darkSecondary}>
            {c.close[3]}
            <BookOpen size={16} />
          </a>
        </div>
      </section>
    </div>
  );
}
