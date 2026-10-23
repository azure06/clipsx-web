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
 {id:'decision', title:c.decisionTitle, body:c.decisionBody, href:'/product#decision-rules', guide:docs.localAi + '#decision-rules'},
 {id:'assistant', title:c.assistantTitle, body:c.assistantBody, href:'/product#assistant-access', guide:docs.recall + '#integrations'},
 ] as const;
 return <>{stories.filter(s => !only || s.id === only).map(s => <section key={s.id} className="scroll-mt-24 border-t border-(--ui-border) py-12 sm:py-16">
 <div className={s.id === 'assistant' ? 'mx-auto w-full' : 'mx-auto max-w-3xl'}>{s.id === 'decision' && <p className="eyebrow mb-4 text-(--ui-violet)">{c.preview}</p>}<h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">{s.title}</h2><p className="mt-5 text-base leading-8 text-(--ui-text-muted)">{s.body}</p><WorkflowDemo locale={locale} kind={s.id}/>
 {s.id === 'rewrite' && <><a className="focus-ring my-3 inline-block text-sm text-(--ui-violet)" href={docs.rewriteExtension}>{c.developer}</a></>}
 {s.id === 'decision' && <p className="text-sm leading-7 text-(--ui-text-muted)">{locale === 'ja' ? '対応する拡張機能は判定機能を要求できますが、現在のRewriteは生成のみを使用します。プライバシー判定と一般的な判定には別々の割り当てがあります。' : 'Compatible extensions can request decision capability; current Rewrite uses generation only. Privacy decisions and general decisions have separate model assignments.'}</p>}
 {s.id === 'assistant' && <p className="text-sm leading-7 text-(--ui-text-muted)">{c.boundary}</p>}
 <div className="mt-5 flex flex-wrap gap-4">{!only && <Link href={s.href} className="focus-ring rounded-sm py-2 text-sm font-semibold text-(--ui-violet)">{c.explore} →</Link>}<a href={s.guide} className="focus-ring rounded-sm py-2 text-sm font-semibold text-(--ui-violet)">{c.setup} ↗</a></div></div></section>)}</>;
}
