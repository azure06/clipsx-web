import type { Locale } from '@/i18n/config';
import { workflowExamples } from '@/content/workflow-examples';
import styles from './home-workflows.module.css';
import { ArrowUp, Plus, Search, SquarePen, Folder, PanelLeft, Settings2 } from 'lucide-react';
export function AssistantExample({locale}: {locale: Locale}) {
 const ja=locale==='ja'; const c=workflowExamples[locale];
 return <figure className={styles.assistant}>
 <div className={styles.chrome}><span className={styles.windowControls} aria-hidden="true"><i/><i/><i/></span><PanelLeft size={15} aria-hidden="true"/><strong>{ja?'アシスタントの作業画面':'Assistant workspace'}</strong><span>MCP · ClipsX</span></div>
 <div className={styles.assistantGrid}>
 <aside className={styles.taskSidebar} aria-label={ja?'サンプルのタスク一覧':'Example task sidebar'}>
  <div className={styles.sidebarAction}><SquarePen size={15} aria-hidden="true"/>{ja?'新しいタスク':'New task'}</div>
  <div className={styles.sidebarAction}><Search size={15} aria-hidden="true"/>{ja?'タスクを検索':'Search tasks'}</div>
  <p>{ja?'プロジェクト':'Projects'}</p>
  <div className={styles.sidebarProject}><Folder size={14} aria-hidden="true"/>support-workspace</div>
  <div className={styles.activeTask}>{ja?'タイムアウトの調査':'Investigate checkout timeout'}</div>
  <div className={styles.otherTask}>{ja?'APIの変更を確認':'Review API changes'}</div>
  <div className={styles.otherTask}>{ja?'リリースノートを準備':'Prepare release notes'}</div>
  <div className={styles.sidebarConnection}><span/>ClipsX · MCP<small>{ja?'読み取り専用の接続例':'Example read-only connection'}</small></div>
 </aside>
 <div className={styles.conversation}>
 <p className={styles.small}>{ja?'サポートエンジニア → 調査の引き継ぎ':'SUPPORT ENGINEER → ENGINEERING HANDOFF'}</p>
 <blockquote className={styles.prompt}>{ja?'コピーした顧客の報告とAPIメモから、開発チーム向けの引き継ぎを作って。根拠と未確認事項を分けて。':'Use the customer ticket and API notes I copied to draft an engineering handoff. Separate evidence from unknowns.'}</blockquote>
 <div className={styles.tool}><span>{ja?'ClipsXで検索':'Searching ClipsX'}</span><code>search_clips · timeout</code><span>{ja?'2件の参考情報を読む':'Reading 2 saved sources'}</span><code>read_clip · ticket / api-note</code></div>
 <div className={styles.handoff}><strong>{ja?'調査の引き継ぎ':'Engineering handoff'}</strong><p>{c.answer}</p><div className={styles.unknown}><span>{ja?'次に確認':'TO INVESTIGATE'}</span><p>{ja?'リクエストID、発生環境、対応するログを確認。リトライが安全とはまだ判断できません。':'Collect request IDs, the affected environment, and matching logs. Retry safety has not been established.'}</p></div></div>
 <div className={styles.composer}>
  <textarea readOnly rows={2} aria-label={ja?'説明用のメッセージ入力欄（送信されません）':'Illustrative message composer (does not send)'} placeholder={ja?'追加の質問を入力…':'Ask a follow-up…'}/>
  <div><span aria-hidden="true"><Plus size={15}/><Settings2 size={14}/></span><small>{ja?'説明用 · 送信されません':'Illustration · does not send'}</small><span className={styles.sendIllustration} aria-hidden="true"><ArrowUp size={15}/></span></div>
 </div>
 </div><aside className={styles.evidence}><p className={styles.small}>{ja?'コピーして保存した根拠':'EVIDENCE YOU COPIED'}</p>{c.sources.map((source,i)=><div key={source}><span className={styles.sourceLabel}>[{i+1}] {i===0?(ja?'顧客の報告':'Customer ticket'):(ja?'APIメモ':'API notes')}</span><p>{source}</p></div>)}<p className={styles.evidenceNote}>{ja?'アシスタントは許可された履歴を取得します。顧客システムやコードベースを自動で調べる例ではありません。':'The assistant retrieves authorized saved context. This example does not inspect the customer’s system or your codebase.'}</p></aside></div>
 <figcaption className={styles.caption}>{ja?'Codexのような会話型作業画面を参考にした説明用UI。実際の製品画面やライブ実行ではありません。':'Illustrative assistant UI inspired by conversational tools such as Codex. Not a product screenshot or a live run.'}</figcaption></figure>;
}
