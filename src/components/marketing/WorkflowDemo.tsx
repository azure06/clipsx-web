"use client";
import { useState } from 'react';
import { AssistantExample } from './AssistantExample';
import type { Locale } from '@/i18n/config';
import { initialExampleState, selectExample, workflowExamples } from '@/content/workflow-examples';
export function WorkflowDemo({ locale, kind }: { locale: Locale; kind: 'meaning' | 'recall' | 'rewrite' | 'decision' | 'assistant' }) {
 const c = workflowExamples[locale];
 const [state, setState] = useState(initialExampleState);
 const button = (label: string, field: keyof typeof state, value: number | boolean, selected: boolean) => <button key={label} type="button" aria-pressed={selected} onClick={() => setState(s => selectExample(s, field, value))} className={`focus-ring min-h-11 rounded-lg border px-3 py-2 text-sm ${selected ? 'border-violet-500 bg-violet-500/10 text-(--ui-violet)' : 'border-(--ui-border) text-(--ui-text-muted)'}`}>{label}</button>;
 const panel = 'rounded-xl border border-(--ui-border) bg-(--ui-surface) p-5 text-base leading-7';
 return <figure className="my-6 min-w-0 space-y-4 break-words">
 {kind === 'meaning' && <><blockquote className={panel}>{c.query}</blockquote><div aria-hidden="true" className="text-center text-(--ui-violet)">↓</div><p className={panel}>{c.clip}</p></>}
 {kind === 'recall' && <><blockquote className={panel}>{c.question}</blockquote><div className={panel}><p>{c.answer}</p><div className="mt-3 flex gap-2">{c.sources.map((_, i) => button(`[${i + 1}]`, 'source', i, state.source === i))}</div></div><ol className="space-y-2">{c.sources.map((source, i) => <li key={source} className={`${panel} ${state.source === i ? 'border-violet-500 bg-violet-500/10' : ''}`}><span className="font-mono text-(--ui-violet)">[{i + 1}] </span>{source}</li>)}</ol></>}
 {kind === 'rewrite' && <><div className={panel}><span className="eyebrow">{c.original}</span><p className="mt-3">{c.originalText}</p></div><div className="flex flex-wrap gap-2">{c.operations.map((label, i) => button(label, 'operation', i, state.operation === i))}</div><div className={panel} aria-live="polite"><span className="eyebrow">{c.result}</span><p className="mt-3">{c.outputs[state.operation]}</p></div></>}
 {kind === 'decision' && <><div className="flex flex-wrap gap-2">{button(c.match, 'matching', true, state.matching)}{button(c.noMatch, 'matching', false, !state.matching)}</div><p className={panel}>{c.samples[state.matching ? 0 : 1]}</p><p className={panel}>{c.rule}</p><div className={panel} aria-live="polite"><span className="eyebrow">{c.judgment}</span><p className="mt-3">{state.matching ? c.yes : c.no}</p></div></>}
 {kind === 'rewrite' && <aside className={panel}><p className="text-sm text-(--ui-text-muted)">{c.mermaid}</p><div className="mt-4 flex flex-wrap items-center gap-3" aria-label="Mermaid"><code className="min-w-0 break-all text-xs">graph LR; Copy--&gt;Create</code><span aria-hidden="true">→</span><span className="rounded-lg border border-violet-500/40 px-3 py-2">Copy</span><span aria-hidden="true">→</span><span className="rounded-lg border border-violet-500/40 px-3 py-2">Create</span></div></aside>}
 {kind === 'assistant' && <AssistantExample locale={locale}/>}
 <figcaption className="text-xs leading-6 text-(--ui-text-muted)">{c.illustrative}</figcaption>
 </figure>;
}
