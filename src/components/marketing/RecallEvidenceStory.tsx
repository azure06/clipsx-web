"use client";

import { useState } from "react";
import { Eye, History, RotateCcw, ShieldOff, Sparkles } from "lucide-react";
import type { Locale } from "@/i18n/config";
import styles from "@/app/[locale]/recall/recall.module.css";

type Story = {
  question: string;
  scope: string;
  answer: Array<string | number>;
  sources: Array<{ app: string; age: string; excerpt: string }>;
  excluded: string;
};

const stories: Record<Locale, Story[]> = {
  en: [
    {
      question: "Where did we decide to meet?",
      scope: "Pinned · Team afternoon",
      answer: [
        "We agreed on Kissa Mori for Thursday at 2 pm ",
        1,
        ". The upstairs area has room for six people and power outlets for laptops ",
        2,
        ".",
      ],
      sources: [
        {
          app: "Team notes",
          age: "Copied yesterday",
          excerpt:
            "Let’s meet at Kissa Mori on Thursday at 2 pm. Bring your ideas for next month’s workshop.",
        },
        {
          app: "Café details",
          age: "Copied Tuesday",
          excerpt:
            "Kissa Mori: upstairs seating for six, power outlets, and a quiet corner for working together.",
        },
      ],
      excluded: "Clips marked as containing secrets are excluded from Recall.",
    },
    {
      question: "How did I connect the local model service?",
      scope: "All history · Ollama",
      answer: [
        "Ollama was connected through the loopback endpoint ",
        1,
        ". An embedding-capable model was enabled for Meaning Search, while a separate generation-capable model powers Recall ",
        2,
        ".",
      ],
      sources: [
        {
          app: "Setup notes",
          age: "Copied 4 days ago",
          excerpt:
            "Open Intelligence → Models and connect http://localhost:11434. ClipsX checks the endpoint before saving it.",
        },
        {
          app: "Model checklist",
          age: "Copied 4 days ago",
          excerpt:
            "Choose an embedding model for Meaning Search. Choose a text-generation model separately for Recall.",
        },
      ],
      excluded: "Credentials and secret-faceted clips are never included.",
    },
    {
      question: "Why did the search index rebuild?",
      scope: "Favorites · Engineering",
      answer: [
        "The embedding model changed, so the vector space was no longer compatible ",
        1,
        ". ClipsX kept the existing index available while building and validating the replacement ",
        2,
        ".",
      ],
      sources: [
        {
          app: "Architecture notes",
          age: "Copied last week",
          excerpt:
            "Model identity, dimensions, normalization, and the chunking version define one compatible embedding space.",
        },
        {
          app: "Recovery notes",
          age: "Copied last week",
          excerpt:
            "A replacement generation builds beside the active index. It becomes active only after validation.",
        },
      ],
      excluded: "No secret clips matched this question.",
    },
  ],
  ja: [
    {
      question: "チームの集まりは、どこに決まった？",
      scope: "ピン留め · チームの集まり",
      answer: [
        "木曜日の14時に喫茶 森で集まることになりました ",
        1,
        "。2階には6人分の席と、ノートパソコン用の電源があります ",
        2,
        "。",
      ],
      sources: [
        {
          app: "チームのメモ",
          age: "昨日コピー",
          excerpt:
            "木曜日の14時に喫茶 森で集まりましょう。来月のワークショップのアイデアを持ち寄ってください。",
        },
        {
          app: "カフェの詳細",
          age: "火曜日にコピー",
          excerpt:
            "喫茶 森：2階に6人分の席と電源あり。一緒に作業できる静かなスペース。",
        },
      ],
      excluded:
        "秘密情報を含むと判定されたクリップは Recall から除外されます。",
    },
    {
      question: "ローカルモデルにはどう接続した？",
      scope: "すべての履歴 · Ollama",
      answer: [
        "Ollama のループバック接続先 ",
        1,
        " を設定しました。意味検索には埋め込み対応モデルを使い、Recall には別の文章生成対応モデルを選びます ",
        2,
        "。",
      ],
      sources: [
        {
          app: "設定メモ",
          age: "4日前にコピー",
          excerpt:
            "Intelligence → Models で http://localhost:11434 に接続。ClipsX が保存前に接続状態を確認する。",
        },
        {
          app: "モデル確認",
          age: "4日前にコピー",
          excerpt:
            "意味検索には埋め込みモデル、Recall には文章生成モデルを個別に選択する。",
        },
      ],
      excluded: "認証情報と秘密情報として検出されたクリップは含まれません。",
    },
    {
      question: "検索インデックスが再構築された理由は？",
      scope: "お気に入り · 開発",
      answer: [
        "埋め込みモデルの変更によってベクトル空間の互換性が失われたためです ",
        1,
        "。既存インデックスを利用可能なまま、置き換え用を構築して検証します ",
        2,
        "。",
      ],
      sources: [
        {
          app: "設計メモ",
          age: "先週コピー",
          excerpt:
            "モデル、次元数、正規化、チャンク処理の版が、互換性のある埋め込み空間を定義する。",
        },
        {
          app: "復旧メモ",
          age: "先週コピー",
          excerpt:
            "置き換え世代は稼働中のインデックスとは別に構築し、検証後だけ有効化する。",
        },
      ],
      excluded: "この質問に一致する秘密情報はありませんでした。",
    },
  ],
};

export function RecallEvidenceStory({ locale }: { locale: Locale }) {
  const [active, setActive] = useState(0);
  const [source, setSource] = useState<number | null>(1);
  const story = stories[locale][active];
  const label =
    locale === "ja"
      ? {
          sample: "質問例",
          question: "質問",
          answer: "生成された回答",
          sources: "件の根拠",
          inspect: "根拠を確認",
          local: "サンプル表示",
          reset: "リセット",
          protected: "保護済み",
        }
      : {
          sample: "Sample questions",
          question: "Your question",
          answer: "Generated answer",
          sources: "sources",
          inspect: "Inspect evidence",
          local: "Illustrative example",
          reset: "Reset",
          protected: "Protected",
        };

  return (
    <div>
      <p className={styles.exampleNote}>
        {locale === "ja"
          ? "サンプルデータを使った操作例です。このページがクリップボードを読み取ったり、モデルを実行したりすることはありません。"
          : "Explore a sample conversation. This page uses bundled examples and never reads your clipboard or runs a model."}
      </p>
      <div className={styles.story}>
        <div className={styles.storyRail}>
          <p className={styles.microLabel}>{label.sample}</p>
          <p className={styles.storyHint}>
            {locale === "ja"
              ? "質問を選び、引用番号を押して根拠を確認してください。"
              : "Choose a question, then select a citation to check its source."}
          </p>
          {stories[locale].map((item, index) => (
            <button
              key={item.question}
              type="button"
              aria-pressed={active === index}
              onClick={() => {
                setActive(index);
                setSource(1);
              }}
              className={styles.questionChoice}
            >
              <span>0{index + 1}</span>
              {item.question}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setActive(0);
              setSource(1);
            }}
            className={styles.reset}
          >
            <RotateCcw size={13} />
            {label.reset}
          </button>
        </div>
        <div className={styles.answerPane}>
          <div className={styles.answerMeta}>
            <span>
              <Sparkles size={14} />
              Recall
            </span>
            <span className={styles.local}>
              <i />
              {label.local}
            </span>
          </div>
          <p className={styles.microLabel}>{label.question}</p>
          <h3>{story.question}</h3>
          <div className={styles.scope}>
            <History size={13} />
            {story.scope}
          </div>
          <div className={styles.answerLabel}>
            <Sparkles size={13} />
            {label.answer}
            <span>
              {story.sources.length} {label.sources}
            </span>
          </div>
          <p className={styles.answerText}>
            {story.answer.map((part, index) =>
              typeof part === "number" ? (
                <button
                  key={`${part}-${index}`}
                  type="button"
                  className={styles.citation}
                  aria-pressed={source === part}
                  aria-controls="recall-evidence-inspector"
                  aria-label={`${label.inspect} ${part}`}
                  onClick={() => setSource(part)}
                >
                  [{part}]
                </button>
              ) : (
                part
              ),
            )}
          </p>
          <div className={styles.safety}>
            <ShieldOff size={14} />
            <span>{story.excluded}</span>
          </div>
          <div className={styles.sources}>
            {story.sources.map((item, index) => (
              <button
                key={item.app}
                type="button"
                aria-pressed={source === index + 1}
                aria-controls="recall-evidence-inspector"
                onClick={() => setSource(index + 1)}
              >
                <span>
                  [{index + 1}] {item.app}
                </span>
                <small>{item.age}</small>
              </button>
            ))}
          </div>
          {source && (
            <div
              id="recall-evidence-inspector"
              className={styles.inspector}
              aria-live="polite"
              aria-atomic="true"
            >
              <div>
                <Eye size={14} />
                <span>
                  {label.inspect} [{source}]
                </span>
              </div>
              <p>{story.sources[source - 1].excerpt}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
