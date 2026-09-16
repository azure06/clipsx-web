'use client';

import { useState } from 'react';
import { Check, Eye, History, RotateCcw, ShieldOff, Sparkles } from 'lucide-react';
import type { Locale } from '@/i18n/config';
import styles from '@/app/[locale]/recall/recall.module.css';

type Story = {
  question: string;
  scope: string;
  answer: Array<string | number>;
  sources: Array<{ app: string; age: string; excerpt: string }>;
  excluded: string;
};

const stories: Record<Locale, Story[]> = {
  en: [
    { question: 'What did we decide about the first desktop release?', scope: 'Pinned · Project launch', answer: ['The first release targets Windows x64 and Linux x64. macOS remains unavailable until signing and notarization are complete ', 1, '. Download availability must follow the certified artifacts shown on the Download page ', 2, '.'], sources: [{ app: 'Release checklist', age: 'Copied Tuesday', excerpt: 'First release targets: Windows x64 and Linux x64. Do not advertise an artifact before platform certification passes.' }, { app: 'Launch notes', age: 'Copied yesterday', excerpt: 'The Download page is the source of truth. macOS waits for signing, hardened runtime, notarization, and stapling.' }], excluded: '1 detected secret was excluded before retrieval.' },
    { question: 'How did I connect the local model service?', scope: 'All history · Ollama', answer: ['Ollama was connected through the loopback endpoint ', 1, '. An embedding-capable model was enabled for Meaning Search, while a separate generation-capable model powers Recall ', 2, '.'], sources: [{ app: 'Setup notes', age: 'Copied 4 days ago', excerpt: 'Open Intelligence → Models and connect http://localhost:11434. ClipsX checks the endpoint before saving it.' }, { app: 'Model checklist', age: 'Copied 4 days ago', excerpt: 'Choose an embedding model for Meaning Search. Choose a text-generation model separately for Recall.' }], excluded: 'Credentials and secret-faceted clips are never included.' },
    { question: 'Why did the search index rebuild?', scope: 'Favorites · Engineering', answer: ['The embedding model changed, so the vector space was no longer compatible ', 1, '. ClipsX kept the existing index available while building and validating the replacement ', 2, '.'], sources: [{ app: 'Architecture notes', age: 'Copied last week', excerpt: 'Model identity, dimensions, normalization, and the chunking version define one compatible embedding space.' }, { app: 'Recovery notes', age: 'Copied last week', excerpt: 'A replacement generation builds beside the active index. It becomes active only after validation.' }], excluded: 'No secret clips matched this question.' },
  ],
  ja: [
    { question: '最初のデスクトップリリースについて何を決めた？', scope: 'ピン留め · リリース計画', answer: ['最初の対象は Windows x64 と Linux x64 です。macOS は署名と公証が完了するまで公開しません ', 1, '。利用可能なビルドはダウンロードページを正として案内します ', 2, '。'], sources: [{ app: 'リリースチェックリスト', age: '火曜日にコピー', excerpt: '初回対象は Windows x64 と Linux x64。プラットフォーム検証に合格する前に配布を案内しない。' }, { app: '公開メモ', age: '昨日コピー', excerpt: 'ダウンロードページを公開状況の正とする。macOS は署名、Hardened Runtime、公証、ステープル完了まで待つ。' }], excluded: '検出された秘密情報 1 件を検索前に除外しました。' },
    { question: 'ローカルモデルにはどう接続した？', scope: 'すべての履歴 · Ollama', answer: ['Ollama のループバック接続先 ', 1, ' を設定しました。意味検索には埋め込み対応モデルを使い、Recall には別の文章生成対応モデルを選びます ', 2, '。'], sources: [{ app: '設定メモ', age: '4日前にコピー', excerpt: 'Intelligence → Models で http://localhost:11434 に接続。ClipsX が保存前に接続状態を確認する。' }, { app: 'モデル確認', age: '4日前にコピー', excerpt: '意味検索には埋め込みモデル、Recall には文章生成モデルを個別に選択する。' }], excluded: '認証情報と秘密情報として検出されたクリップは含まれません。' },
    { question: '検索インデックスが再構築された理由は？', scope: 'お気に入り · 開発', answer: ['埋め込みモデルの変更によってベクトル空間の互換性が失われたためです ', 1, '。既存インデックスを利用可能なまま、置き換え用を構築して検証します ', 2, '。'], sources: [{ app: '設計メモ', age: '先週コピー', excerpt: 'モデル、次元数、正規化、チャンク処理の版が、互換性のある埋め込み空間を定義する。' }, { app: '復旧メモ', age: '先週コピー', excerpt: '置き換え世代は稼働中のインデックスとは別に構築し、検証後だけ有効化する。' }], excluded: 'この質問に一致する秘密情報はありませんでした。' },
  ],
};

export function RecallEvidenceStory({ locale }: { locale: Locale }) {
  const [active, setActive] = useState(0);
  const [source, setSource] = useState<number | null>(1);
  const story = stories[locale][active];
  const label = locale === 'ja' ? { sample: '質問例', question: '質問', answer: '根拠に基づく回答', sources: '件の根拠', inspect: '根拠を確認', local: 'この端末上', reset: 'リセット', protected: '保護済み' } : { sample: 'Sample questions', question: 'Your question', answer: 'Evidence-backed answer', sources: 'sources', inspect: 'Inspect evidence', local: 'On this device', reset: 'Reset', protected: 'Protected' };

  return <div className={styles.story}>
    <div className={styles.storyRail}>
      <p className={styles.microLabel}>{label.sample}</p>
      {stories[locale].map((item, index) => <button key={item.question} type="button" aria-pressed={active === index} onClick={() => { setActive(index); setSource(1); }} className={styles.questionChoice}><span>0{index + 1}</span>{item.question}</button>)}
      <button type="button" onClick={() => { setActive(0); setSource(1); }} className={styles.reset}><RotateCcw size={13} />{label.reset}</button>
    </div>
    <div className={styles.answerPane}>
      <div className={styles.answerMeta}><span><Sparkles size={14} />Recall</span><span className={styles.local}><i />{label.local}</span></div>
      <p className={styles.microLabel}>{label.question}</p>
      <h3>{story.question}</h3>
      <div className={styles.scope}><History size={13} />{story.scope}</div>
      <div className={styles.answerLabel}><Sparkles size={13} />{label.answer}<span>{story.sources.length} {label.sources}</span></div>
      <p className={styles.answerText}>{story.answer.map((part, index) => typeof part === 'number' ? <button key={`${part}-${index}`} type="button" className={styles.citation} aria-label={`${label.inspect} ${part}`} onClick={() => setSource(part)}>[{part}]</button> : part)}</p>
      <div className={styles.safety}><ShieldOff size={14} /><span>{story.excluded}</span><strong><Check size={12} />{label.protected}</strong></div>
      <div className={styles.sources}>
        {story.sources.map((item, index) => <button key={item.app} type="button" aria-pressed={source === index + 1} onClick={() => setSource(index + 1)}><span>[{index + 1}] {item.app}</span><small>{item.age}</small></button>)}
      </div>
      {source && <div className={styles.inspector} aria-live="polite"><div><Eye size={14} /><span>{label.inspect} [{source}]</span></div><p>{story.sources[source - 1].excerpt}</p></div>}
    </div>
  </div>;
}
