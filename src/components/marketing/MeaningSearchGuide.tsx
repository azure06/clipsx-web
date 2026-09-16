import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Cpu,
  FileText,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import type { Locale } from "@/i18n/config";
import styles from "@/app/[locale]/recall/recall.module.css";

const content = {
  en: {
    back: "All documentation",
    title: "Remember the idea. Find the clip.",
    intro:
      "The words you remember aren’t always the words you copied. Meaning Search finds related text in your history using an optional model running on your device.",
    setup: "Set up with Ollama",
    explore: "How it works",
    queryLabel: "You remember",
    query: "the café with a quiet place to work",
    resultLabel: "A related clip",
    result:
      "Kissa Mori — upstairs seating, power outlets, and a peaceful corner for an afternoon with your laptop.",
    caption:
      "Illustrative match · Results depend on your history and chosen model.",
    nav: [
      "How it works",
      "What it searches",
      "Get started",
      "Common questions",
    ],
    explain: "Same memory. Different words.",
    explanation:
      "Describe a concept in your own words. ClipsX combines related matches with exact text results, and takes you back to the original clip.",
    steps: [
      [
        "Your query",
        "Describe what you remember, then narrow by pins, favorites, tags, or content type.",
      ],
      [
        "Local matching",
        "Your configured embedding model compares the query with indexed text from eligible clips.",
      ],
      [
        "Original clips",
        "Inspect the matching passage and use the saved content. Meaning Search retrieves text; Recall can generate an answer.",
      ],
    ],
    searches: "More than the first line.",
    searchesIntro:
      "Searchable text can come from several parts of a clip. The original content stays intact.",
    inputs: [
      [
        "Rich text & documents",
        "Ready text representations, including Markdown, HTML, JSON, code, and tables.",
      ],
      [
        "Notes & tags",
        "The context you add is searchable alongside captured content.",
      ],
      [
        "Completed OCR",
        "Text extracted from images can participate when OCR is available and has completed. This is not visual image search.",
      ],
    ],
    start: "A little setup. A more useful memory.",
    startIntro:
      "Ollama and an embedding-capable model are required. Model size, language support, speed, and memory use vary.",
    checklist: [
      [
        "Connect Ollama",
        "Install and start Ollama. In ClipsX, open Intelligence → Models and connect your local endpoint.",
      ],
      [
        "Choose an embedding model",
        "Select an installed model that reports embedding support, then enable Meaning Search. A text-generation model serves a different purpose.",
      ],
      [
        "Let the index build",
        "Indexing runs in the background. Exact text search remains available while your semantic index is prepared.",
      ],
    ],
    local: "Your history, on your device.",
    localBody:
      "Queries, indexed text, and model processing stay local with the supported loopback Ollama connection. ClipsX does not silently download models or send your history to a hosted AI service.",
    privacy: "Read the privacy guide",
    faq: "A few useful details.",
    questions: [
      [
        "What if Ollama is unavailable?",
        "Exact text search remains available. Check that Ollama is running, refresh the connection in Intelligence, and confirm your selected model is installed.",
      ],
      [
        "Why doesn’t a result match what I meant?",
        "Semantic matches are approximate and depend on the model and indexed content. Try different wording or fewer filters. Use exact search for identifiers, commands, paths, and error messages.",
      ],
      [
        "What does the similarity percentage mean?",
        "It measures similarity in the selected model’s embedding space, not the probability that a result is correct. An optional minimum filters semantic matches only; it never removes exact text matches.",
      ],
      [
        "Can I change the model or delete the index?",
        "Yes. Changing the embedding model builds a replacement index alongside the active one. Deleting the Meaning Search index leaves your original clips and exact search intact. Ordinary clip edits update that clip’s index data.",
      ],
    ],
    next: "Need an answer across several clips?",
    nextBody:
      "Recall uses a separately configured generation model to answer questions with inspectable citations.",
    nextLink: "Explore Recall",
    download: "Get ClipsX",
  },
  ja: {
    back: "ドキュメント一覧",
    title: "言葉を忘れても、意味から見つかる。",
    intro:
      "覚えている言葉と、コピーした言葉は同じとは限りません。意味検索は、端末内で動く任意のモデルを使い、履歴から関連するテキストを探します。",
    setup: "Ollama を設定",
    explore: "仕組みを見る",
    queryLabel: "覚えていること",
    query: "静かに仕事ができるカフェ",
    resultLabel: "関連するクリップ",
    result:
      "喫茶 森 — 2階に座席と電源あり。ノートパソコンを広げて、落ち着いて午後を過ごせる。",
    caption: "検索結果の例 · 結果は履歴と選択したモデルによって異なります。",
    nav: ["仕組み", "検索対象", "設定手順", "よくある質問"],
    explain: "違う言葉でも、同じ記憶へ。",
    explanation:
      "覚えている内容を自分の言葉で入力。関連する結果と文字検索の結果を組み合わせ、元のクリップへ戻れます。",
    steps: [
      [
        "検索する",
        "覚えている内容を入力し、ピン、お気に入り、タグ、種類で範囲を絞ります。",
      ],
      [
        "端末内で照合",
        "設定した埋め込みモデルが、質問と対象クリップのインデックスを比較します。",
      ],
      [
        "原本を確認",
        "一致した箇所を確認し、保存した内容を使えます。意味検索は検索を、Recall は回答の生成を担当します。",
      ],
    ],
    searches: "最初の一行だけではありません。",
    searchesIntro:
      "クリップ内のさまざまなテキストが検索対象になります。原本はそのまま保持されます。",
    inputs: [
      [
        "リッチテキストと文書",
        "Markdown、HTML、JSON、コード、表など、準備済みのテキスト表現。",
      ],
      [
        "メモとタグ",
        "自分で追加した情報も、保存した内容と一緒に検索できます。",
      ],
      [
        "完了した OCR",
        "OCR が利用可能で処理済みの場合、画像から抽出されたテキストも対象です。画像そのものの類似検索ではありません。",
      ],
    ],
    start: "少しの設定で、記憶を探しやすく。",
    startIntro:
      "Ollama と埋め込み対応モデルが必要です。モデルによって容量、対応言語、速度、メモリ使用量が異なります。",
    checklist: [
      [
        "Ollama に接続",
        "Ollama を導入・起動し、ClipsX の Intelligence → Models でローカル接続先を設定します。",
      ],
      [
        "埋め込みモデルを選択",
        "埋め込み対応として表示される導入済みモデルを選び、意味検索を有効にします。文章生成モデルとは用途が異なります。",
      ],
      [
        "インデックスを準備",
        "バックグラウンドで構築します。その間も文字検索は利用できます。",
      ],
    ],
    local: "履歴も処理も、この端末で。",
    localBody:
      "対応するループバック Ollama 接続では、検索語、対象テキスト、モデル処理は端末内に留まります。モデルの無断ダウンロードや外部 AI サービスへの履歴送信は行いません。",
    privacy: "プライバシーガイド",
    faq: "知っておきたいこと。",
    questions: [
      [
        "Ollama が利用できないときは？",
        "文字検索は引き続き使えます。Ollama の起動を確認し、Intelligence で接続を更新して、選択したモデルが導入済みか確認してください。",
      ],
      [
        "意図した結果が見つからないときは？",
        "意味の一致は近似で、モデルとインデックス内容に依存します。表現を変えるか、絞り込みを減らしてみてください。識別子、コマンド、パス、エラー文には文字検索が適しています。",
      ],
      [
        "類似度のパーセントは何ですか？",
        "モデルの埋め込み空間での類似度です。正解の確率ではありません。任意の下限値は意味検索の結果だけに適用され、文字検索の結果は除外しません。",
      ],
      [
        "モデル変更やインデックス削除はできますか？",
        "はい。モデル変更時は既存インデックスを残して置き換え用を構築します。意味検索インデックスを削除しても原本と文字検索は残ります。通常の編集では、そのクリップの検索データだけを更新します。",
      ],
    ],
    next: "複数のクリップから答えを知りたい？",
    nextBody:
      "Recall は別途設定した文章生成モデルで、参照元を確認できる回答を作ります。",
    nextLink: "Recall を見る",
    download: "ClipsX を入手",
  },
} as const;

export function MeaningSearchGuide({ locale }: { locale: Locale }) {
  const c = content[locale];
  const ids = ["how-it-works", "searchable-content", "setup", "questions"];
  return (
    <div className={styles.page} lang={locale}>
      <Link href="/docs" className={styles.back}>
        <ArrowLeft size={14} />
        {c.back}
      </Link>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <Search size={14} />
            Meaning Search
          </p>
          <h1>{c.title}</h1>
          <p className={styles.lede}>{c.intro}</p>
          <div className={styles.actions}>
            <Link href="/docs/ollama" className={styles.primary}>
              {c.setup}
              <ArrowRight size={16} />
            </Link>
            <a href="#how-it-works" className={styles.secondary}>
              {c.explore}
            </a>
          </div>
        </div>
        <figure className={styles.matchScene}>
          <div className={styles.sceneHeader}>
            <Search size={15} />
            <span>Meaning Search</span>
            <span className={styles.sceneBadge}>
              {locale === "ja" ? "ローカル" : "Local"}
            </span>
          </div>
          <p className={styles.sceneLabel}>{c.queryLabel}</p>
          <blockquote>{c.query}</blockquote>
          <div className={styles.matchConnector} aria-hidden="true">
            <span />
            <Cpu size={22} />
            <span />
          </div>
          <div className={styles.matchResult}>
            <p className={styles.sceneLabel}>
              <FileText size={14} />
              {c.resultLabel}
            </p>
            <p>{c.result}</p>
          </div>
          <figcaption>{c.caption}</figcaption>
        </figure>
      </section>
      <nav
        className={styles.sectionNav}
        aria-label={locale === "ja" ? "このページの内容" : "On this page"}
      >
        {c.nav.map((label, i) => (
          <a key={label} href={`#${ids[i]}`}>
            {label}
            <ArrowRight size={12} />
          </a>
        ))}
      </nav>
      <section id={ids[0]} className={styles.guideSection}>
        <div className={styles.guideIntro}>
          <p className={styles.eyebrow}>{c.nav[0]}</p>
          <h2>{c.explain}</h2>
          <p>{c.explanation}</p>
        </div>
        <ol className={styles.steps}>
          {c.steps.map(([title, body], i) => (
            <li key={title}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section id={ids[1]} className={styles.guideSection}>
        <div className={styles.guideIntro}>
          <p className={styles.eyebrow}>{c.nav[1]}</p>
          <h2>{c.searches}</h2>
          <p>{c.searchesIntro}</p>
        </div>
        <div className={styles.inputList}>
          {c.inputs.map(([title, body]) => (
            <article key={title}>
              <FileText size={18} />
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section id={ids[2]} className={styles.guideSection}>
        <div className={styles.guideIntro}>
          <p className={styles.eyebrow}>{c.nav[2]}</p>
          <h2>{c.start}</h2>
          <p>{c.startIntro}</p>
          <Link href="/docs/ollama" className={styles.textLink}>
            {c.setup}
            <BookOpen size={16} />
          </Link>
        </div>
        <ol className={styles.steps}>
          {c.checklist.map(([title, body], i) => (
            <li key={title}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <aside className={styles.localNote}>
        <ShieldCheck size={25} />
        <div>
          <h2>{c.local}</h2>
          <p>{c.localBody}</p>
          <Link href="/docs/privacy" className={styles.textLink}>
            {c.privacy}
            <ArrowRight size={14} />
          </Link>
        </div>
      </aside>
      <section id={ids[3]} className={styles.guideSection}>
        <div className={styles.guideIntro}>
          <p className={styles.eyebrow}>{c.nav[3]}</p>
          <h2>{c.faq}</h2>
        </div>
        <div className={styles.faq}>
          {c.questions.map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
      <section className={styles.closing}>
        <div>
          <Sparkles size={22} />
          <h2>{c.next}</h2>
          <span>{c.nextBody}</span>
        </div>
        <div>
          <Link href="/recall" className={styles.primary}>
            {c.nextLink}
            <ArrowRight size={16} />
          </Link>
          <Link href="/download" className={styles.darkSecondary}>
            {c.download}
          </Link>
        </div>
      </section>
    </div>
  );
}
