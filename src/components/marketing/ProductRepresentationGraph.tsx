"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Clipboard, FileText, Code2, Link2, Sparkles, Copy, RotateCcw } from "lucide-react";
import type { Locale } from "@/i18n/config";
import styles from "./product.module.css";

const content = {
  en: {
    label: "One clip, several possibilities", hint: "Select a node to explore", reset: "Reset",
    note: "A map of representations and actions, not a workflow editor in the desktop app.",
    origin: "Origin", processing: "Processing", output: "Available use",
    nodes: [
      ["Captured clip", "HTML + plain text", "Original", "On your device", "Inspect the captured representations.", "One copy can include rich content and a plain-text companion. Keep both together rather than flattening the source."],
      ["Rich preview", "Readable content", "Rendered from original", "On your device", "Read before you reuse.", "A content-aware view makes supported formatting easier to inspect. The captured representation remains available."],
      ["Markdown", "Portable text", "Derived representation", "Depends on the available converter", "Copy a compatible text form.", "Where a compatible conversion is available, rich content can become Markdown for notes, documentation, or an editor."],
      ["Extract links", "URLs in the content", "Derived representation", "Depends on the available action", "Reuse a detected URL.", "Relevant actions can pull useful parts out of a clip. Availability depends on the content and installed capabilities."],
      ["Extension", "Optional transformation", "Extension-produced", "Check the package permissions", "Review the result before using it.", "An optional extension can provide a focused transformation. Its processing and required access depend on the package you approve."],
      ["Use the result", "Copy · paste · save", "Selected representation", "Chosen desktop action", "Choose an available destination.", "Use an available representation for your next task. Actions depend on the clip, platform, and installed capabilities."]
    ]
  },
  ja: {
    label: "ひとつのクリップから、複数の使い道へ", hint: "ノードを選んで詳細を表示", reset: "リセット",
    note: "表現と操作の関係を示す図です。デスクトップアプリのワークフローエディターではありません。",
    origin: "生成元", processing: "処理", output: "使い方",
    nodes: [
      ["保存したクリップ", "HTML + テキスト", "オリジナル", "端末内", "保存された表現を確認。", "1回のコピーにはリッチな内容とプレーンテキストが含まれることがあります。元の内容を平坦化せず、まとめて保持します。"],
      ["リッチプレビュー", "読みやすい表示", "元の内容から表示", "端末内", "再利用する前に確認。", "内容に合った表示で対応する書式を確認できます。元の表現も引き続き利用できます。"],
      ["Markdown", "持ち運べるテキスト", "派生した表現", "利用可能な変換機能による", "互換テキストをコピー。", "対応する変換機能がある場合、リッチな内容をメモやドキュメント向けのMarkdownに変換できます。"],
      ["リンクの抽出", "内容に含まれるURL", "派生した表現", "利用可能な操作による", "検出したURLを再利用。", "内容に合う操作で、クリップの必要な部分を取り出せます。利用可否は内容と追加した機能に依存します。"],
      ["拡張機能", "任意の変換", "拡張機能が生成", "パッケージの権限を確認", "結果を確認して利用。", "任意の拡張機能で専用の変換を追加できます。処理方法と必要なアクセスは承認するパッケージによって異なります。"],
      ["結果を使う", "コピー・貼り付け・保存", "選択した表現", "選んだデスクトップ操作", "利用可能な保存先や操作を選択。", "次の作業に合った表現を使えます。利用可能な操作はクリップ、OS、追加機能によって異なります。"]
    ]
  }
} as const;
const icons = [Clipboard, FileText, Code2, Link2, Sparkles, Copy];
const paths = ["M120 220 C185 220 175 70 240 70", "M120 220 H240", "M120 220 C185 220 175 370 240 370", "M360 70 H480", "M360 220 C430 220 415 300 480 300", "M360 370 C425 370 425 300 480 300", "M540 110 V260"];

export function ProductRepresentationGraph({ locale }: { locale: Locale }) {
  const c = content[locale];
  const [selected, setSelected] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const node = c.nodes[selected];
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "Home" ? 0 : event.key === "End" ? 5 : ["ArrowRight", "ArrowDown"].includes(event.key) ? (index + 1) % 6 : ["ArrowLeft", "ArrowUp"].includes(event.key) ? (index + 5) % 6 : null;
    if (next === null) return;
    event.preventDefault(); setSelected(next); refs.current[next]?.focus();
  }
  return <div className={styles.graph}>
    <div className={styles.graphTop}><span>{c.hint}</span><button type="button" onClick={() => setSelected(0)}><RotateCcw size={13} aria-hidden="true" />{c.reset}</button></div>
    <div className={styles.graphCanvas} role="group" aria-label={c.label}>
      <svg viewBox="0 0 660 440" preserveAspectRatio="none" aria-hidden="true">{paths.map(path => <path key={path} d={path} />)}</svg>
      {c.nodes.map((item, index) => { const Icon = icons[index]; return <button key={item[0]} ref={element => { refs.current[index] = element; }} type="button" className={styles.graphNode} data-node={index} aria-pressed={selected === index} onClick={() => setSelected(index)} onKeyDown={event => navigate(event, index)}><Icon size={20} aria-hidden="true" /><strong>{item[0]}</strong><small>{item[1]}</small></button>; })}
    </div>
    <div className={styles.graphInspector} aria-live="polite"><div><span className={styles.eyebrow}>{node[2]}</span><h3>{node[0]}</h3><p>{node[5]}</p></div><dl><div><dt>{c.processing}</dt><dd>{node[3]}</dd></div><div><dt>{c.output}</dt><dd>{node[4]}</dd></div></dl></div>
    <p className={styles.graphNote}>{c.note}</p>
  </div>;
}
