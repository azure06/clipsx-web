import { Search, Languages, Terminal, ArrowRight } from 'lucide-react';
import type { Locale } from '@/i18n/config';
import { workflowExamples } from '@/content/workflow-examples';
import { getDocumentationConfig } from '@/config/site';
import { Link } from '@/i18n/routing';
import { WorkflowDemo } from './WorkflowDemo';
import { AssistantExample } from './AssistantExample';
import styles from './home-workflows.module.css';
export function HomeWorkflows({locale}: {locale: Locale}) {
 const ja=locale==='ja'; const c=workflowExamples[locale]; const docs=getDocumentationConfig(locale);
 const cards=ja?[
 ['サポートエンジニア','あの報告を、探し直さずに。','コピーした顧客の報告や技術メモを意味で探し、Recallで根拠を確認。'],
 ['顧客とやり取りする人','伝えたいことを、伝わる文章へ。','同じ原文を翻訳、短縮、丁寧な文章へ。Rewriteの出力を確認して使えます。'],
 ['AIを使う開発者','参考情報を、アシスタントにも。','保存したクリップを許可したアシスタントから検索し、作業の文脈に。']
 ]:[
 ['SUPPORT ENGINEERS','That report you copied? Bring it back.','Find a copied customer report or technical note by meaning, then inspect the evidence with Recall.'],
 ['CLIENT-FACING WORK','The same message. Ready for its reader.','Translate, shorten, or polish a draft with Rewrite. Check the result before sending it.'],
 ['DEVELOPERS USING AI','Bring your saved context to the task.','Let an authorized assistant retrieve copied material instead of pasting the same context again.']
 ];
 const icons=[Search,Languages,Terminal];
 return <>
 <section className="cx-shell cx-workflow"><p className="cx-kicker">{ja?'続きは、ここから。':'PICK UP WHERE YOU LEFT OFF'}</p><h2>{ja?'コピーと貼り付けの間で、仕事を止めない。':'Good work shouldn’t get lost between copy and paste.'}</h2><div className="cx-benefits">{cards.map(([role,title,body],i)=>{const Icon=icons[i];return <article key={role} className={`cx-benefit-${i} ${i === 0 ? styles.focusCard : ''}`}><p className={styles.small}>{role}</p><div className="cx-feature-icon"><Icon size={24}/></div><h3>{title}</h3><p>{body}</p>{i===0&&<div className="cx-capture-art"><span>ticket.txt</span><span>api-notes.md</span><span>error.png</span></div>}</article>})}</div></section>
 <section className={`cx-shell ${styles.searchStory}`}><div className={styles.storyCopy}><p className="cx-kicker">{ja?'意味検索 + RECALL':'MEANING SEARCH + RECALL'}</p><h2>{ja?'覚えているのは、言葉より状況。':'You remember the problem. Not the wording.'}</h2><p>{ja?'サポートの調査では、顧客の報告と技術メモを行き来します。コピー済みの情報を探し、回答の引用から原文に戻れます。':'Investigating an issue means connecting a customer report with technical notes. Find what you already copied, then follow the answer back to its sources.'}</p><Link href="/product#meaning-search" className="cx-text-link">{c.explore}<ArrowRight size={17}/></Link><p className={styles.note}>{c.meaningBody} {c.recallBody}</p></div><div className={styles.retrievalStage}><div className={styles.searchCard}><span className={styles.small}>{ja?'覚えていること':'WHAT YOU REMEMBER'}</span><p>⌕ {c.query}</p><div className={styles.clip}><span>{ja?'関連する保存済みクリップ':'A RELATED SAVED CLIP'}</span><p>{c.clip}</p></div></div><WorkflowDemo locale={locale} kind="recall"/></div></section>
 <section className={`cx-shell ${styles.transformStory}`}><div className={styles.transformMain}><div className={styles.storyCopy}><p className="cx-kicker">{ja?'拡張機能 · 顧客とのやり取りに':'EXTENSIONS · FOR CLIENT-FACING WORK'}</p><h2>{ja?'送る前に、ちょうどいい言葉へ。':'A better draft, before you hit send.'}</h2><p>{ja?'相手の言語に合わせたり、依頼を簡潔にしたり。同じ原文から、用途に合う文章を作れます。送信は自分で確認してから。':'A client needs a different language. A request needs fewer words. Start from the same original, choose a transformation, then review what you reuse. ClipsX does not send the message for you.'}</p><Link href="/extensions" className="cx-text-link">{ja?'拡張機能を見る':'Explore extensions'}<ArrowRight size={17}/></Link></div><div className={styles.rewriteStage}><WorkflowDemo locale={locale} kind="rewrite"/></div></div><aside className={styles.decisionCard}><p className={styles.small}>{c.preview}</p><h3>{ja?'まず、条件に合うかを判断。':'First, decide whether it fits.'}</h3><p>{ja?'エラーについてのコピーだけにDebuggingタグを付けるルール。判定は文章生成とは別の役割です。':'A rule can tag a new copy as Debugging when it describes a software error. Judging a condition is separate from generating text.'}</p><WorkflowDemo locale={locale} kind="decision"/><p className={styles.note}>{ja?'現在のRewriteは生成のみを使用。判定と連動するRewriteの例ではありません。':'Current Rewrite uses generation only. This is not a decision-powered Rewrite demonstration.'}</p><Link href="/product#decision-rules" className="cx-text-link">{ja?'判定ルールのプレビュー':'Preview decision rules'}<ArrowRight size={17}/></Link></aside></section>
 <section className={`cx-shell ${styles.assistantStory}`}><div className={styles.assistantHeading}><div><p className="cx-kicker">MCP · {ja?'アシスタントへ、文脈を渡す':'CONTEXT FOR YOUR ASSISTANT'}</p><h2>{ja?'貼り直す代わりに、探してもらう。':'Stop pasting context. Let your assistant find it.'}</h2></div><p>{ja?'サポートエンジニアが、コピー済みの顧客報告とAPIメモから開発チーム向けの引き継ぎを作る例です。根拠と未確認事項を分けます。':'A support engineer turns a copied ticket and API notes into an engineering handoff—with evidence and unanswered questions kept separate.'}</p></div><AssistantExample locale={locale}/><div className={styles.assistantFooter}><p>{c.assistantBody} {c.boundary}</p><a href={docs.recall+'#integrations'} className="cx-text-link">{c.setup}<ArrowRight size={17}/></a></div></section>
 </>;
}
