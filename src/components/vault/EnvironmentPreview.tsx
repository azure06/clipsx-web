"use client";

import { Copy, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { parseEnvironmentPreview, redactEnvironmentValue } from "@/lib/vault/env-format";

export function EnvironmentPreview({ source, clipboardClearMs = 60_000 }: { source: string; clipboardClearMs?: number }) {
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set());
  const [copied, setCopied] = useState<number | null>(null);
  const entries = parseEnvironmentPreview(source);
  async function copy(entry: { line: number; value: string }) {
    await navigator.clipboard.writeText(entry.value); setCopied(entry.line);
    if (clipboardClearMs > 0) window.setTimeout(() => void navigator.clipboard.writeText(""), clipboardClearMs);
    window.setTimeout(() => setCopied(null), 1500);
  }
  return <div className="mt-6 overflow-hidden rounded-xl border border-[var(--vault-border)]"><div className="border-b border-[var(--vault-border)] bg-[var(--vault-muted)] px-4 py-3 text-sm text-slate-600 dark:text-slate-300">Values are redacted by default. The raw encrypted file is unchanged.</div><ul>{entries.map((entry) => { const visible = revealed.has(entry.line); return <li key={`${entry.line}-${entry.key}`} className="flex items-center gap-3 border-b border-[var(--vault-border)] px-4 py-3 last:border-b-0"><code className="min-w-0 flex-1 truncate text-sm font-semibold">{entry.key}</code><code className="min-w-0 flex-1 truncate text-right text-sm text-slate-600 dark:text-slate-300">{visible ? entry.value : redactEnvironmentValue(entry.value)}</code><button type="button" onClick={() => setRevealed((current) => { const next = new Set(current); if (visible) next.delete(entry.line); else next.add(entry.line); return next; })} className="rounded p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10" aria-label={`${visible ? "Hide" : "Reveal"} ${entry.key}`}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button><button type="button" onClick={() => void copy(entry)} className="rounded p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10" aria-label={`Copy ${entry.key}`}><Copy size={16} /></button>{copied === entry.line && <span className="text-xs text-sky-700 dark:text-sky-300">Copied</span>}</li>; })}</ul></div>;
}
