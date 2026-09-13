"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Pause,
  Play,
  Blocks,
  Braces,
  Check,
  Clipboard,
  FileText,
  Layers,
  Link2,
  Moon,
  Pin,
  Search,
  Settings,
  Sparkles,
  Star,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import type { Locale } from "@/i18n/config";

const labels = {
  en: {
    search: "Search sample clips…",
    all: "All clips",
    pinned: "Favorites",
    today: "Today",
    preview: "Preview",
    copy: "Copy sample",
    copied: "Copied",
    failed: "Copy unavailable",
    empty: "No sample clips found. Try “ideas” or “json”.",
    hint: "Try searching or select a clip",
    note: "Sample content only — your clipboard is never read.",
    text: "Text",
    saved: "Saved on this device",
    title: "Ideas for a slower Sunday",
    body: "Leave the phone at home.\nFind a bookshop you haven’t been to.\nTake the long way back.\n\nMake a little room for something unexpected.",
    link: "A little inspiration for later",
    json: "A small idea, ready to build",
    clear: "Clear search",
    count: "sample clips",
  },
  ja: {
    search: "サンプルを検索…",
    all: "すべて",
    pinned: "お気に入り",
    today: "今日",
    preview: "プレビュー",
    copy: "サンプルをコピー",
    copied: "コピーしました",
    failed: "コピーできません",
    empty: "見つかりません。「日曜」や「json」で検索してください。",
    hint: "検索やクリップの選択を試してみよう",
    note: "サンプルデータのみ。クリップボードは読み取りません。",
    text: "テキスト",
    saved: "この端末に保存",
    title: "ゆっくり過ごす日曜日のアイデア",
    body: "スマホは家に置いて。\n初めての本屋を見つけよう。\n帰りは少し遠回り。\n\n思いがけない何かのために、余白をつくろう。",
    link: "あとで読みたいインスピレーション",
    json: "小さなアイデアを、形に",
    clear: "検索をクリア",
    count: "件のサンプル",
  },
};

const subscribeMotion = (onChange: () => void) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
const getReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const serverReducedMotion = () => true;

export function HomePreview({ locale }: { locale: Locale }) {
  const c = labels[locale];
  const ui =
    locale === "ja"
      ? {
          light: "ライト",
          dark: "ダーク",
          theme: "プレビューのテーマ",
          back: "履歴に戻る",
          pinned: "ピン留め",
          clips: "クリップ",
          detail: "クリップを表示",
          sample: "デスクトップアプリの操作サンプル",
          source: "形式",
          note: "メモ",
          trip: "京都への週末旅行",
          tripBody:
            "ホテルのチェックインは15時から。\n予約名：Alex Morgan\n\n金曜の午後に出発。\n本屋に立ち寄る時間をつくる。",
          checklist: "公開前のチェックリスト",
          checklistBody:
            "スクリーンショットを更新\nドキュメントを確認\nリリースノートを準備",
        }
      : {
          light: "Light",
          dark: "Dark",
          theme: "Preview appearance",
          back: "Back to clips",
          pinned: "Pinned",
          clips: "Clips",
          detail: "View clip",
          sample: "An interactive desktop app example",
          source: "Format",
          note: "Note",
          trip: "A weekend in Kyoto",
          tripBody:
            "Hotel check-in starts at 3:00 PM.\nReservation under: Alex Morgan\n\nLeave on Friday afternoon.\nMake time for a bookshop on the way.",
          checklist: "Before the next release",
          checklistBody:
            "Update the screenshots\nReview the documentation\nPrepare the release notes",
        };
  const tourLabels =
    locale === "ja"
      ? ["コピーを保存", "履歴から検索", "図としてプレビュー"]
      : ["Capture a thought", "Find it again", "See it differently"];
  const tourBody =
    locale === "ja"
      ? [
          "いつもどおりコピー。ClipsX が履歴を保存。",
          "「京都」を検索して、旅行のメモを再発見。",
          "Mermaid 拡張機能で、テキストを図として表示。",
        ]
      : [
          "Copy as usual. ClipsX keeps it within reach.",
          "Search “Kyoto” to bring back your travel notes.",
          "A Mermaid extension turns copied text into a diagram.",
        ];
  const clips = [
    {
      id: "diagram",
      title: locale === "ja" ? "アイデアから、その先へ" : "From a thought to a plan",
      subtitle: "Mermaid",
      type: "Mermaid",
      icon: Blocks,
      content: "graph LR\n  Idea --> Copy\n  Copy --> Create",
      favorite: false,
    },
    {
      id: "ideas",
      title: ui.trip,
      subtitle: ui.note,
      type: c.text,
      icon: FileText,
      content: ui.tripBody,
      favorite: true,
      pinned: true,
    },
    {
      id: "link",
      title: "github.com/azure06/clipsx",
      subtitle: c.link,
      type: "URL",
      icon: Link2,
      content: "https://github.com/azure06/clipsx",
      favorite: false,
    },
    {
      id: "json",
      title: '{ "name": "something wonderful" }',
      subtitle: c.json,
      type: "JSON",
      icon: Braces,
      content:
        '{\n  "name": "something wonderful",\n  "status": "just getting started",\n  "possibilities": [\n    "capture",\n    "create",\n    "repeat"\n  ]\n}',
      favorite: false,
    },
    {
      id: "color",
      title: "#7C6CF2",
      subtitle:
        locale === "ja"
          ? "次のプロジェクトの色"
          : "A color for the next project",
      type: c.text,
      icon: Clipboard,
      content: "#7C6CF2",
      favorite: true,
    },
    {
      id: "checklist",
      title: ui.checklist,
      subtitle: ui.note,
      type: c.text,
      icon: FileText,
      content: ui.checklistBody,
      favorite: false,
      pinned: true,
    },
    {
      id: "sunday",
      title: c.title,
      subtitle: ui.note,
      type: c.text,
      icon: FileText,
      content: c.body,
      favorite: false,
    },
  ];
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    getReducedMotion,
    serverReducedMotion,
  );
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [tourStep, setTourStep] = useState(0);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("ideas");
  const [scope, setScope] = useState("all");
  const [copyState, setCopyState] = useState("");
  const running = playing && visible && !reducedMotion;
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.3 },
    );
    if (rootRef.current) observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      if (tourStep === 2) {
        setPlaying(false);
        return;
      }
      const next = tourStep + 1;
      setTourStep(next);
      setQuery(next === 1 ? (locale === "ja" ? "京都" : "Kyoto") : "");
      setSelected(next === 2 ? "diagram" : "ideas");
      setScope("all");
      setMobileDetail(next === 2);
      setCopyState("");
    }, 4200);
    return () => window.clearInterval(timer);
  }, [running, tourStep, locale]);
  const filtered = clips.filter(
    (clip) =>
      (scope === "all" ||
        (scope === "favorites" ? clip.favorite : clip.pinned)) &&
      `${clip.title} ${clip.subtitle} ${clip.content} ${clip.type}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const active = filtered.find((clip) => clip.id === selected) ?? filtered[0];
  function showStep(step: number) {
    setPlaying(false);
    setTourStep(step);
    setQuery(step === 1 ? (locale === "ja" ? "京都" : "Kyoto") : "");
    setSelected(step === 2 ? "diagram" : "ideas");
    setScope("all");
    setCopyState("");
    setMobileDetail(step === 2);
  }
  const choose = (id: string) => {
    setSelected(id);
    setCopyState("");
    setMobileDetail(true);
  };
  async function copySample() {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(active.content);
      setCopyState(c.copied);
    } catch {
      setCopyState(c.failed);
    }
  }
  return (
    <div
      ref={rootRef}
      className="cx-demo-wrap"
      data-theme={theme}
      data-detail={mobileDetail}
      data-playing={running}
    >
      <div className="cx-demo-controls">
        <span>{ui.sample}</span>
        <div className="cx-demo-switches">
          <button
            type="button"
            className="cx-tour-play"
            onClick={() => {
              if (running) setPlaying(false);
              else {
                showStep(0);
                setPlaying(true);
              }
            }}
            disabled={reducedMotion}
            aria-label={
              locale === "ja"
                ? running
                  ? "ツアーを一時停止"
                  : "ツアーを再生"
                : running
                  ? "Pause tour"
                  : "Play tour"
            }
          >
            {running ? <Pause size={13} /> : <Play size={13} />}
            <span>
              {locale === "ja"
                ? running
                  ? "一時停止"
                  : "再生"
                : running
                  ? "Pause"
                  : "Play tour"}
            </span>
          </button>
          <div className="cx-theme-toggle" role="group" aria-label={ui.theme}>
            <button
              type="button"
              aria-pressed={theme === "light"}
              onClick={() => {
                setPlaying(false);
                setTheme("light");
              }}
            >
              <Sun size={14} />
              {ui.light}
            </button>
            <button
              type="button"
              aria-pressed={theme === "dark"}
              onClick={() => {
                setPlaying(false);
                setTheme("dark");
              }}
            >
              <Moon size={14} />
              {ui.dark}
            </button>
          </div>
        </div>
      </div>
      <div
        className="cx-app"
        onPointerDown={() => setPlaying(false)}
        onFocusCapture={() => setPlaying(false)}
      >
        <div className="cx-app-title">
          <Layers size={13} />
          <span>{ui.clips}</span>
          <div aria-hidden="true">
            <span>
              {clips.length} {ui.clips}
            </span>
            <span>—</span>
            <span>□</span>
            <X size={12} />
          </div>
        </div>
        <div className="cx-app-body">
          <div className="cx-app-sidebar" aria-hidden="true">
            <Layers size={19} />
            <Sparkles size={18} />
            <Blocks size={18} />
            <div />
            <UserRound size={17} />
            <Settings size={17} />
          </div>
          <div className="cx-app-workspace">
            <div className="cx-app-search">
              <Search size={18} />
              <input
                aria-label={c.search}
                placeholder={c.search}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setCopyState("");
                  setMobileDetail(false);
                }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setCopyState("");
                  }}
                  aria-label={c.clear}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="cx-app-split">
              <div className="cx-app-history">
                <div className="cx-app-tabs">
                  {[
                    ["all", c.all],
                    ["favorites", c.pinned],
                    ["pinned", ui.pinned],
                  ].map(([id, label]) => (
                    <button
                      type="button"
                      key={id}
                      aria-pressed={scope === id}
                      onClick={() => {
                        setScope(id);
                        setCopyState("");
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="cx-app-date">{c.today}</p>
                <div className="cx-app-list">
                  {filtered.map((clip) => {
                    const Icon = clip.icon;
                    return (
                      <button
                        type="button"
                        key={clip.id}
                        onClick={() => choose(clip.id)}
                        aria-pressed={active?.id === clip.id}
                        className="cx-clip"
                      >
                        <span className={`cx-clip-icon cx-clip-${clip.id}`}>
                          <Icon size={17} />
                        </span>
                        <span className="cx-clip-text">
                          <strong>{clip.title}</strong>
                          <small>{clip.subtitle}</small>
                        </span>
                        {clip.pinned ? (
                          <Pin size={12} className="cx-clip-star" />
                        ) : clip.favorite ? (
                          <Star size={12} className="cx-clip-star" />
                        ) : null}
                      </button>
                    );
                  })}
                  {!filtered.length && (
                    <p className="cx-app-empty" role="status">
                      {c.empty}
                    </p>
                  )}
                </div>
              </div>
              <div className="cx-app-preview">
                <div className="cx-app-preview-heading">
                  <button
                    type="button"
                    className="cx-preview-back"
                    onClick={() => setMobileDetail(false)}
                  >
                    <ArrowLeft size={14} />
                    {ui.back}
                  </button>
                  <span>{c.preview}</span>
                  <span>{active?.type ?? "—"}</span>
                </div>
                {active && (
                  <>
                    <div className="cx-representation">
                      <span>{active.type}</span>
                      <span>{ui.source}</span>
                    </div>
                    <div
                      key={active.id}
                      className={`cx-app-content ${active.id === "json" ? "cx-app-code" : ""}`}
                    >
                      <span className="cx-content-type">{active.type}</span>
                      <h3>{active.title}</h3>
                      {active.id === "diagram" ? (
                        <div className="cx-demo-diagram">
                          <span>Idea</span>
                          <ArrowRight size={22} />
                          <span>Copy</span>
                          <ArrowRight size={22} />
                          <span>Create</span>
                        </div>
                      ) : (
                        <pre>{active.content}</pre>
                      )}
                    </div>
                    <div className="cx-app-copy-row">
                      <span>
                        <span className="cx-status-dot" />
                        {c.saved}
                      </span>
                      <button type="button" onClick={copySample}>
                        {copyState === c.copied ? (
                          <Check size={13} />
                        ) : (
                          <Clipboard size={13} />
                        )}
                        {c.copy}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="cx-app-bottom">
          <span>
            {filtered.length} {c.count}
          </span>
          <span role="status">{copyState || c.hint}</span>
        </div>
      </div>
      <div
        className="cx-tour-steps"
        aria-label={locale === "ja" ? "操作サンプル" : "Example workflow"}
      >
        {tourLabels.map((label, index) => (
          <button
            type="button"
            key={label}
            aria-pressed={tourStep === index}
            onClick={() => showStep(index)}
          >
            <span className="cx-tour-index">0{index + 1}</span>
            <span>
              <strong>{label}</strong>
              <small>{tourBody[index]}</small>
            </span>
            <span className="cx-tour-progress" />
          </button>
        ))}
      </div>
      <p className="cx-demo-note">{c.note}</p>
    </div>
  );
}
