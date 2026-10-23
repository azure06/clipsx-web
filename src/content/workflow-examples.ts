export const workflowExamples = {
 en: {
  illustrative: 'Illustrative example · fixed sample content', original: 'Original', result: 'Example result',
  meaningTitle: 'Find what you almost remember.', meaningBody: 'Search by the idea you remember, even when the saved words are different. Optional: requires a configured compatible embedding model and indexing.',
  query: 'Checkout breaks when requests overlap', clip: 'Customer ticket: two simultaneous checkout requests fail after 30 seconds.',
  recallTitle: 'Ask your history. Check the sources.', recallBody: 'Ask a question about selected history, then inspect the clips supporting the answer. Requires a compatible chat model; generated answers can be wrong.',
  question: 'What do the copied ticket and API notes establish?', answer: 'The ticket reports a 30-second timeout during concurrent checkout requests [1]. The API notes specify a 30-second client timeout [2]. The cause is not established.', sources: ['Customer ticket: two concurrent checkout requests time out after 30 seconds.', 'API notes: the default client timeout is 30 seconds.'],
  rewriteTitle: 'Turn copied content into something useful.', rewriteBody: 'Translate, shorten, or rephrase with Rewrite and your configured generation model. Install the extension and review its permissions. Generation writes text; a decision model judges a condition.',
  originalText: 'Hey, could you please send me the updated meeting agenda before Thursday? Thanks!', operations: ['Translate', 'Shorten', 'Professional'], outputs: ['木曜日までに更新した会議の議題を送っていただけますか。ありがとうございます。', 'Please send the updated agenda before Thursday.', 'Please share the updated meeting agenda before Thursday. Thank you.'],
  decisionTitle: 'Your clipboard, with rules that understand the content.', decisionBody: 'Ask a question about new copied text, then choose an action when it matches. This example adds a tag; a model judgment can be wrong.', preview: 'Preview · coming in a future desktop release', match: 'Matching example', noMatch: 'Non-matching example', rule: 'Does this describe a software error?', samples: ['The application crashed with a connection timeout.', 'Our team lunch is on Thursday.'], judgment: 'Example model judgment', yes: 'Matches → add Debugging tag', no: 'Does not match → no action from this rule',
  assistantTitle: 'Let your assistant find what you copied.', assistantBody: 'Connect Codex, Claude Code, or another compatible MCP client to search saved clips. ClipsX must be running and the external client needs configuration. Read-only access is the default.', flow: ['Saved clips', 'Authorized local MCP connection', 'External assistant', 'Retrieved context'], boundary: 'History is stored locally. Hosted models and external assistants may send task content to their providers. Choose connections and permissions deliberately.', explore: 'Explore this workflow', setup: 'Read the setup guide', mermaid: 'Mermaid: copied diagram text → visual diagram. No LLM required.', developer: 'Rewrite developer tutorial (English)',
 },
 ja: {
  illustrative: '説明用の例 · 固定のサンプルデータ', original: '元の文章', result: '結果の例',
  meaningTitle: 'うろ覚えでも、見つかる。', meaningBody: '保存された文章と違う言葉でも、覚えている意味から探せます。任意機能で、対応する埋め込みモデルの設定と索引の作成が必要です。', query: '注文のリクエストが重なると失敗する', clip: '顧客の報告：同時に2件の注文を送ると、30秒後にタイムアウトする。',
  recallTitle: '履歴に質問する。根拠を確かめる。', recallBody: '選択した履歴に質問し、回答を支えるクリップを確認できます。対応するチャットモデルが必要です。生成された回答には誤りがあり得ます。', question: 'コピーした報告とAPIメモから何がわかる？', answer: '報告では同時注文が30秒後にタイムアウトします [1]。APIメモの既定タイムアウトも30秒です [2]。原因はまだ不明です。', sources: ['顧客の報告：同時に2件の注文を送ると30秒後にタイムアウトする。', 'APIメモ：クライアントの既定タイムアウトは30秒。'],
  rewriteTitle: 'コピーを、次の作業に役立つ形へ。', rewriteBody: 'Rewriteと設定した生成モデルで翻訳、短縮、言い換えができます。拡張機能を導入し、権限を確認してください。生成モデルは文章を作り、判定モデルは条件を評価します。', originalText: 'すみませんが、木曜日までに更新した会議の議題を送ってもらえますか。よろしくお願いします。', operations: ['翻訳', '短くする', '丁寧にする'], outputs: ['Please send the updated meeting agenda before Thursday. Thank you.', '木曜日までに更新した議題を送ってください。', '木曜日までに更新した会議の議題をご共有いただけますと幸いです。よろしくお願いいたします。'],
  decisionTitle: '内容を理解するルールを、クリップボードに。', decisionBody: '新しくコピーした文章への質問と、一致したときの操作を設定します。この例はタグの追加です。モデルの判定には誤りがあり得ます。', preview: 'プレビュー · 今後のデスクトップ版で公開予定', match: '一致する例', noMatch: '一致しない例', rule: 'ソフトウェアのエラーについて書かれていますか？', samples: ['接続がタイムアウトし、アプリが終了しました。', 'チームのランチは木曜日です。'], judgment: 'モデル判定の例', yes: '一致 → Debuggingタグを追加', no: '不一致 → このルールによる操作なし',
  assistantTitle: 'コピーした内容を、アシスタントから探す。', assistantBody: 'Codex、Claude Codeなどの対応MCPクライアントを許可して、保存済みクリップを検索できます。ClipsXの起動と外部クライアントの設定が必要です。既定のアクセスは読み取り専用です。', flow: ['保存済みクリップ', '許可されたローカルMCP接続', '外部アシスタント', '取得した参考情報'], boundary: '履歴は端末内に保存されます。ホスト型モデルや外部アシスタントは、処理する内容を提供元に送信する場合があります。接続先と権限を確認してください。', explore: 'この使い方を見る', setup: '設定ガイドを読む', mermaid: 'Mermaid：コピーした図のテキスト → 図として表示。LLMは不要です。', developer: 'Rewrite開発チュートリアル（英語）',
 },
} as const;
export type ExampleState = { operation: number; source: number; matching: boolean };
export const initialExampleState: ExampleState = { operation: 0, source: 0, matching: true };
export function selectExample(state: ExampleState, field: keyof ExampleState, value: number | boolean): ExampleState {
 if (field === 'matching' && typeof value === 'boolean') return { ...state, matching: value };
 if (field !== 'matching' && typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < (field === 'operation' ? 3 : 2)) return { ...state, [field]: value };
 return state;
}
