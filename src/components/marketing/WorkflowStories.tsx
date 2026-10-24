import type { Locale } from '@/i18n/config';
import { workflowExamples } from '@/content/workflow-examples';
import { getDocumentationConfig } from '@/config/site';
import { Link } from '@/i18n/routing';
import { WorkflowDemo } from './WorkflowDemo';
export function WorkflowStories({locale, only}: {locale: Locale; only?: 'decision' | 'assistant'}) {
 const c = workflowExamples[locale]; const docs = getDocumentationConfig(locale);
 const stories = [
 {id:'meaning', title:c.meaningTitle, body:c.meaningBody, href:'/meaning-search', guide:docs.meaningSearch},
 {id:'recall', title:c.recallTitle, body:c.recallBody, href:'/recall', guide:docs.recall},
 {id:'rewrite', title:c.rewriteTitle, body:c.rewriteBody, href:'/extensions', guide:docs.extensions},
 {id:'decision', title:c.decisionTitle, body:c.decisionBody, href:'/product#decision-rules', guide:docs.decisionModels},
 {id:'assistant', title:c.assistantTitle, body:c.assistantBody, href:'/product#assistant-access', guide:docs.mcp},
 ] as const;
 return <>{stories.filter(s => !only || s.id === only).map(s => <section key={s.id} className="scroll-mt-24 border-t border-(--ui-border) py-12 sm:py-16">
 <div className={s.id === 'assistant' ? 'mx-auto w-full' : 'mx-auto max-w-3xl'}>{s.id === 'decision' && <p className="eyebrow mb-4 text-(--ui-violet)">{c.preview}</p>}<h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">{s.title}</h2><p className="mt-5 text-base leading-8 text-(--ui-text-muted)">{s.body}</p><WorkflowDemo locale={locale} kind={s.id}/>
 {s.id === 'rewrite' && <><a className="focus-ring my-3 inline-block text-sm text-(--ui-violet)" href={docs.rewriteExtension}>{c.developer}</a></>}
 {s.id === 'decision' && <><p className="text-sm leading-7 text-(--ui-text-muted)">{locale === 'ja' ? 'プライバシー判定と一般的な判定は別々に割り当てます。自動実行の条件には一般的な判定を使い、Rewriteは生成モデルで結果を作ります。秘密情報の完全な検出は保証しません。' : 'Privacy checks and General decisions have separate assignments. Automation conditions use General decisions; Rewrite uses generation to write the result. Secret detection is not guaranteed.'}</p><a href={docs.automation} className="focus-ring mt-4 inline-block rounded-sm py-2 text-sm font-semibold text-(--ui-violet)">{locale === 'ja' ? '条件付き自動実行を設定する' : 'Set up conditional automation'} ↗</a></>}
 {s.id === 'assistant' && <p className="text-sm leading-7 text-(--ui-text-muted)">{c.boundary}</p>}
 <div className="mt-5 flex flex-wrap gap-4">{!only && <Link href={s.href} className="focus-ring rounded-sm py-2 text-sm font-semibold text-(--ui-violet)">{c.explore} →</Link>}<a href={s.guide} className="focus-ring rounded-sm py-2 text-sm font-semibold text-(--ui-violet)">{c.setup} ↗</a></div></div></section>)}</>;
}
