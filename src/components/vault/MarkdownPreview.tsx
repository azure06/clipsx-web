"use client";

import { useEffect, useId, useMemo, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownPreviewProps = { markdown: string; className?: string };

function childrenToText(children: ReactNode): string {
  return Array.isArray(children) ? children.map(childrenToText).join("") : typeof children === "string" ? children : "";
}

function MermaidDiagram({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId().replace(/[:]/g, "");
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const node = ref.current;
    async function render() {
      if (!node) return;
      node.replaceChildren(); setError(false);
      try {
        const mermaid = (await import("mermaid")).default;
        const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: dark ? "dark" : "default" });
        const { svg } = await mermaid.render(`vault-mermaid-${id}`, chart);
        if (!cancelled) node.innerHTML = svg;
      } catch {
        if (!cancelled) setError(true);
      }
    }
    void render();
    return () => { cancelled = true; node?.replaceChildren(); };
  }, [chart, id]);

  if (error) return <div role="status" className="rounded-lg border border-amber-400/40 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-100">This Mermaid diagram could not be rendered safely.</div>;
  return <div className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-black/20"><div ref={ref} data-testid="mermaid-diagram" className="overflow-x-auto [&_svg]:mx-auto [&_svg]:max-w-full" /></div>;
}

function safeHref(href?: string): string | null {
  if (!href) return null;
  try { return ["http:", "https:", "mailto:"].includes(new URL(href, typeof window === "undefined" ? "https://vault.invalid" : window.location.origin).protocol) ? href : null; } catch { return null; }
}

export function MarkdownPreview({ markdown, className }: MarkdownPreviewProps) {
  const components = useMemo(() => ({
    pre: ({ children }: ComponentPropsWithoutRef<"pre">) => <>{children}</>,
    h1: ({ children }: ComponentPropsWithoutRef<"h1">) => <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{children}</h1>,
    h2: ({ children }: ComponentPropsWithoutRef<"h2">) => <h2 className="mt-7 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{children}</h2>,
    h3: ({ children }: ComponentPropsWithoutRef<"h3">) => <h3 className="mt-6 text-xl font-semibold text-slate-900 dark:text-slate-100">{children}</h3>,
    p: ({ children }: ComponentPropsWithoutRef<"p">) => <p className="text-[15px] leading-7 text-slate-700 dark:text-slate-200">{children}</p>,
    ul: ({ children }: ComponentPropsWithoutRef<"ul">) => <ul className="list-disc space-y-2 pl-6 text-[15px] text-slate-700 dark:text-slate-200">{children}</ul>,
    ol: ({ children }: ComponentPropsWithoutRef<"ol">) => <ol className="list-decimal space-y-2 pl-6 text-[15px] text-slate-700 dark:text-slate-200">{children}</ol>,
    blockquote: ({ children }: ComponentPropsWithoutRef<"blockquote">) => <blockquote className="border-l-4 border-sky-400/70 bg-sky-50/70 px-4 py-2 italic text-slate-700 dark:bg-sky-400/10 dark:text-slate-200">{children}</blockquote>,
    a: ({ children, href }: ComponentPropsWithoutRef<"a">) => { const safe = safeHref(href); return safe ? <a href={safe} target="_blank" rel="noreferrer noopener" className="font-medium text-sky-700 underline underline-offset-4 dark:text-sky-300">{children}</a> : <span>{children}</span>; },
    code: ({ className, children, ...rest }: ComponentPropsWithoutRef<"code">) => {
      const language = className?.match(/language-([\w-]+)/)?.[1]?.toLowerCase(); const code = childrenToText(children).replace(/\n$/, "");
      if (language === "mermaid") return <MermaidDiagram chart={code} />;
      if (!language) return <code {...rest} className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[.92em] text-fuchsia-800 dark:bg-white/10 dark:text-fuchsia-200">{children}</code>;
      return <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-sm text-slate-100 dark:border-white/10"><code {...rest} className={className}>{code}</code></pre>;
    },
  }), []);
  return <div className={className ?? "space-y-4"}><ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{markdown}</ReactMarkdown></div>;
}
