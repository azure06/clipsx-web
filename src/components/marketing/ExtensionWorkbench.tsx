"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Braces,
  Check,
  ChevronRight,
  CircleDot,
  FileCode2,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import type { Locale } from "@/i18n/config";

const examples = {
  en: [
    {
      id: "mermaid",
      label: "Mermaid",
      kind: "Renderer",
      source: "graph LR\n  Copy --> Understand\n  Understand --> Act",
      result: "diagram",
    },
    {
      id: "jwt",
      label: "JWT Inspector",
      kind: "Inspector",
      source: "eyJhbGciOiJSUzI1NiJ9.eyJyb2xlIjoiZWRpdG9yIn0…",
      result: "jwt",
    },
    {
      id: "data",
      label: "Data Tools",
      kind: "Transformer",
      source: '{ "firstName": "Aiko", "active": true }',
      result: "data",
    },
  ],
  ja: [
    {
      id: "mermaid",
      label: "Mermaid",
      kind: "表示",
      source: "graph LR\n  コピー --> 理解\n  理解 --> 操作",
      result: "diagram",
    },
    {
      id: "jwt",
      label: "JWT Inspector",
      kind: "解析",
      source: "eyJhbGciOiJSUzI1NiJ9.eyJyb2xlIjoiZWRpdG9yIn0…",
      result: "jwt",
    },
    {
      id: "data",
      label: "Data Tools",
      kind: "変換",
      source: '{ "firstName": "Aiko", "active": true }',
      result: "data",
    },
  ],
} as const;

const subscribeMotion = (callback: () => void) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};

export function ExtensionWorkbench({ locale }: { locale: Locale }) {
  const items = examples[locale];
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
  useEffect(() => {
    if (reducedMotion || !playing) return;
    const timer = window.setInterval(
      () => setActive((value) => (value + 1) % items.length),
      4400,
    );
    return () => window.clearInterval(timer);
  }, [items.length, playing, reducedMotion]);
  const selectExample = (index: number) => {
    setActive(index);
    setPlaying(false);
  };
  const item = items[active];
  return (
    <div className="ex-workbench">
      <div className="ex-workbench-bar">
        <span />
        <span />
        <span />
        <p>CLIPS / PREVIEW</p>
        <div>
          <CircleDot size={11} />
          {locale === "ja" ? "ローカル" : "Local"}
        </div>
      </div>
      <div className="ex-workbench-body">
        <nav
          aria-label={locale === "ja" ? "拡張機能の例" : "Extension examples"}
        >
          {items.map((candidate, index) => (
            <button
              type="button"
              key={candidate.id}
              aria-label={`${candidate.label}: ${candidate.kind}`}
              aria-pressed={active === index}
              onClick={() => selectExample(index)}
            >
              <span className={`ex-mini-mark ex-mini-${candidate.id}`}>
                {candidate.id === "jwt" ? (
                  <Braces size={14} />
                ) : candidate.id === "data" ? (
                  <FileCode2 size={14} />
                ) : (
                  "M"
                )}
              </span>
              <span>
                <b>{candidate.label}</b>
                <small>{candidate.kind}</small>
              </span>
              <ChevronRight size={14} />
            </button>
          ))}
        </nav>
        <div className="ex-workbench-stage" key={item.id}>
          <div className="ex-stage-source">
            <span>{locale === "ja" ? "コピーした内容" : "Copied content"}</span>
            <pre>{item.source}</pre>
          </div>
          <div className="ex-stage-connector">
            <Sparkles size={15} />
            <i />
          </div>
          <div className={`ex-stage-result ex-result-${item.result}`}>
            <div className="ex-result-head">
              <span className={`ex-mini-mark ex-mini-${item.id}`}>
                {item.id === "jwt" ? (
                  <Braces size={14} />
                ) : item.id === "data" ? (
                  <FileCode2 size={14} />
                ) : (
                  "M"
                )}
              </span>
              <b>{item.label}</b>
              <em>
                <Check size={11} />
                {locale === "ja" ? "適用中" : "Applied"}
              </em>
            </div>
            {item.result === "diagram" && (
              <div className="ex-diagram">
                <span>Copy</span>
                <i />
                <span>Understand</span>
                <i />
                <span>Act</span>
              </div>
            )}
            {item.result === "jwt" && (
              <div className="ex-jwt">
                <div>
                  <span>alg</span>
                  <b>RS256</b>
                </div>
                <div>
                  <span>role</span>
                  <b>editor</b>
                </div>
                <p>
                  <LockKeyhole size={12} />
                  {locale === "ja" ? "署名は未検証" : "Signature not verified"}
                </p>
              </div>
            )}
            {item.result === "data" && (
              <pre className="ex-code">
                <span>type</span> Person = {`{\n`} firstName: <b>string</b>;
                {`\n`} active: <b>boolean</b>;{`\n`}
                {`}`}
              </pre>
            )}
          </div>
        </div>
      </div>
      <div className="ex-workbench-foot">
        <span>
          {locale === "ja"
            ? "元のクリップは変更されません"
            : "Original clip unchanged"}
        </span>
        <div>
          {items.map((candidate, index) => (
            <button
              key={candidate.id}
              type="button"
              aria-label={`${candidate.label} ${index + 1}`}
              aria-current={active === index}
              onClick={() => selectExample(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
