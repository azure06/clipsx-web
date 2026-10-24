import { Search, Languages, Terminal, ArrowRight } from 'lucide-react';
import type { Locale } from '@/i18n/config';
import { workflowExamples } from '@/content/workflow-examples';
import { getDocumentationConfig } from '@/config/site';
import { Link } from '@/i18n/routing';
import { WorkflowDemo } from './WorkflowDemo';
import { AssistantExample } from './AssistantExample';
import { RewriteExample } from './RewriteExample';
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
 <section className="cx-shell cx-workflow"><p className="cx-kicker">{ja?'続きは、ここから。':'PICK UP WHERE YOU LEFT OFF'}</p><h2>{ja?'コピーと貼り付けの間で、仕事を止めない。':'Good work shouldn’t get lost between copy and paste.'}</h2><div className="cx-benefits">{cards.map(([role,title,body],i)=>{const Icon=icons[i];return <article key={role} className={`cx-benefit-${i}`}><p className={styles.small}>{role}</p><div className="cx-feature-icon"><Icon size={24}/></div><h3>{title}</h3><p>{body}</p>{i===0&&<div className="cx-capture-art"><span>ticket.txt</span><span>api-notes.md</span><span>error.png</span></div>}</article>})}</div></section>
 <section className={`cx-shell ${styles.searchStory}`}><div className={styles.storyCopy}><p className="cx-kicker">{ja?'意味検索 + RECALL':'MEANING SEARCH + RECALL'}</p><h2>{ja?'覚えているのは、言葉より状況。':'You remember the problem. Not the wording.'}</h2><p>{ja?'サポートの調査では、顧客の報告と技術メモを行き来します。コピー済みの情報を探し、回答の引用から原文に戻れます。':'Investigating an issue means connecting a customer report with technical notes. Find what you already copied, then follow the answer back to its sources.'}</p><Link href="/product#meaning-search" className="cx-text-link">{c.explore}<ArrowRight size={17}/></Link><p className={styles.note}>{c.meaningBody} {c.recallBody}</p></div><div className={styles.retrievalStage}><div className={styles.searchCard}><span className={styles.small}>{ja?'覚えていること':'WHAT YOU REMEMBER'}</span><p>⌕ {c.query}</p><div className={styles.clip}><span>{ja?'関連する保存済みクリップ':'A RELATED SAVED CLIP'}</span><p>{c.clip}</p></div></div><WorkflowDemo locale={locale} kind="recall"/></div></section>
 <div className={styles.featureBand}>
  <section id="rewrite-workflow" className={`cx-shell ${styles.transformStory}`}>
   <div className={styles.transformIntro}>
    <p className="cx-kicker">{ja?'拡張機能 · REWRITE':'EXTENSIONS · REWRITE'}</p>
    <h2>{ja?'ひとつの文章を、\n伝わる形に。':'One draft.\nMore ways to say it.'}</h2>
    <p>{ja?'翻訳する。短くする。丁寧にする。コピーした文章を、相手や用途に合わせて変換。結果を確認してから使えます。':'Translate a message. Trim a request. Find a more professional tone. Transform what you copied, then review it before you use it.'}</p>
    <Link href="/extensions" className="cx-text-link">{ja?'拡張機能を見る':'Explore extensions'}<ArrowRight size={17}/></Link>
    <p className={styles.note}>{ja?'Rewriteには設定済みの生成モデルが必要です。':'Rewrite requires a configured generation model.'}</p>
   </div>
   <div className={styles.transformMain}>
    <RewriteExample locale={locale}/>
    <p className={styles.mermaidNote}>{ja?'文章以外にも。Mermaidならコピーしたテキストを図に。LLMは不要です。':'More than text: Mermaid turns copied diagram text into a visual. No LLM needed.'}</p>
   </div>
   <aside className={styles.decisionCard}>
    <div><p className={styles.small}>{c.preview}</p><h3>{ja?'条件に合うときだけ、次の操作へ。':'The right action, when the copy fits.'}</h3><p>{ja?'エラー報告にタグを付ける。翻訳が必要な文章だけRewriteを実行する。質問と操作を選び、サンプルで条件を確認できます。判定には誤りがあり得ます。':'Tag an error report. Run a translation setup only when the text needs it. Choose the question and action, then test the condition on a sample. Model judgments can be wrong.'}</p></div>
    <div className={styles.ruleSummary}><span>{c.rule}</span><ArrowRight size={18} aria-hidden="true"/><strong>{ja?'一致 → Debuggingタグ':'Match → Debugging tag'}</strong><Link href="/product#decision-rules" className="cx-text-link">{ja?'判定ルールを見る':'Explore decision rules'}<ArrowRight size={17}/></Link><a href={docs.automation} className="cx-text-link">{ja?'自動実行を設定する':'Set up automation'}<ArrowRight size={17}/></a><p className={styles.note}>{ja?'プライバシー判定は別に割り当てます。機密情報の検出を保証するものではありません。':'Privacy checks have a separate assignment. Detection of sensitive content is not guaranteed.'}</p></div>
   </aside>
  </section>
 </div>
 <section className={`cx-shell ${styles.assistantStory}`}><div className={styles.assistantHeading}><div><p className="cx-kicker">MCP · {ja?'アシスタントへ、文脈を渡す':'CONTEXT FOR YOUR ASSISTANT'}</p><h2>{ja?'貼り直す代わりに、探してもらう。':'Stop pasting context. Let your assistant find it.'}</h2></div><p>{ja?'サポートエンジニアが、コピー済みの顧客報告とAPIメモから開発チーム向けの引き継ぎを作る例です。根拠と未確認事項を分けます。':'A support engineer turns a copied ticket and API notes into an engineering handoff—with evidence and unanswered questions kept separate.'}</p></div><AssistantExample locale={locale}/><div className={styles.assistantFooter}><p>{c.assistantBody} {c.boundary}</p><a href={docs.mcp} className="cx-text-link">{c.setup}<ArrowRight size={17}/></a></div></section>
 </>;
}
