import type { BlogPost } from './blog';
import { l } from './marketing';

export const localMessageRewrite: BlogPost = {
  slug: 'rewrite-work-message-local-ai-windows',
  date: '2026-11-07', modifiedDate: '2026-11-07',
  topic: l('Local AI workflows', 'ローカル AI 活用'),
  title: l('Rewrite work messages with local AI on Windows, macOS, and Linux', 'ローカル AI で仕事のメッセージを推敲する（Windows・macOS・Linux 対応）'),
  description: l('Refine copied messages on-device using Ollama and ClipsX Rewrite across Windows, macOS, and Linux. Compare model suggestions side-by-side, verify factual commitments, and keep full control over what you send.', 'Ollama と ClipsX Rewrite を使い、コピーした下書きをローカル環境で推敲・校正。実際の書き換え例を比較しながら、変更されたニュアンスや要件を確認し、納得した内容だけを安全に貼り付けられます（Windows・macOS・Linux 対応）。'),
  takeaway: l('Let a local LLM propose phrasing improvements without sending your drafts to the cloud. Always compare against the original to ensure deadlines, constraints, and commitments remain intact before pasting.', '下書きを外部クラウドへ送らず、ローカル LLM で言い換え案を生成。原文を手元に残したまま、締め切りや前提条件が勝手に変わっていないか照合し、納得した文章だけをコピー・貼り付けできます。'),
  image: {
    src: '/images/blog/local-message-rewrite.webp', width: 1600, height: 900,
    alt: l('A draft message passes through a local model and a review checkpoint before a final message is chosen.', '下書きがローカルモデルと確認工程を通り、最後に使う文章が選ばれる流れ。'),
    caption: l('Conceptual illustration: generation proposes; you review and choose. This is not a product screenshot.', '概念図：生成モデルが提案し、自分で確認して選びます。製品画面のキャプチャではありません。'),
  },
  overview: {
    caption: l('A controlled, human-in-the-loop rewrite workflow', '手元でコントロールできるローカル推敲フロー'),
    steps: [
      { icon: 'clipboard', title: l('Copy your draft', '下書きをコピー'), detail: l('Capture text into ClipsX without external transmission.', '外部送信なしでクリップボードに下書きを保持。') },
      { icon: 'model', title: l('Run Rewrite', 'Rewrite を実行'), detail: l('Process the clip via your locally running Ollama chat model.', 'ローカル起動中の Ollama チャットモデルで文章を変換。') },
      { icon: 'check', title: l('Compare, then paste', '差分を確認して貼り付け'), detail: l('Verify tone, deadlines, and requirements before pasting.', '語調や期日、要件の変更を原文と照合してから貼り付け。') },
    ],
    note: l('Manual Rewrite never overwrites your clipboard or pastes automatically. Every generated result is presented for inspection before use.', '手動実行の Rewrite がクリップボードを勝手に上書きしたり自動貼り付けしたりすることはありません。生成結果は必ず手動で確認できます。'),
  },
  sections: [
    {
      id: 'a-real-rewrite', title: l('Soften the tone without losing the request', '伝える内容を崩さず、トーンを丁寧に整える'),
      paragraphs: [l('Across Windows, macOS, and Linux, ClipsX can dispatch saved text clips directly to a locally configured Ollama chat model via the Rewrite extension. The example below shows an unedited prompt and the actual response produced by gemma3:4b using the Business preset.', 'ClipsX は Windows、macOS、Linux の各プラットフォームで、保存したテキストクリップを Rewrite 拡張機能経由でローカル稼働中の Ollama チャットモデルへ受け渡せます。以下は、架空の督促メッセージに対してローカルの gemma3:4b（Business プリセット）が実際に返した出力例です。')],
      rewriteExample: {
        caption: l('One controlled run, not a promise of identical results', '一回の動作確認で得た例です。同じ出力を保証するものではありません'),
        before: l("You still haven't sent the agenda. Send it by Thursday at 3 pm. I need it before I can finish the review.", "You still haven't sent the agenda. Send it by Thursday at 3 pm. I need it before I can finish the review."),
        after: l('Please send the agenda by Thursday at 3:00 PM to ensure it is available prior to the review completion.', 'Please send the agenda by Thursday at 3:00 PM to ensure it is available prior to the review completion.'),
        note: l('The opening is noticeably more diplomatic and the deadline is preserved, but the conclusion becomes somewhat verbose and obscures the hard blocking dependency. This illustrates why model suggestions should be audited rather than accepted blindly.', '冒頭の刺々しいニュアンスが緩和され、期限（木曜 15:00）も正確に維持されています。一方で末尾はやや形式的で冗長になり、「議題が来ないとレビューが完了できない」というブロッカー関係が曖昧になっています。AI の出力をそのまま鵜呑みにせず、人間による確認が不可欠であることを示す好例です。'),
      },
      details: {
        summary: l('What was actually tested?', '動作確認時の環境と前提条件'),
        paragraphs: [l('Tested on November 7, 2026, using ClipsX 0.1.12 with Ollama / gemma3:4b assigned to Extension text generation. We copied the test message, triggered Transform → Rewrite → Business, and verified complete on-device generation without network requests. Ollama confirmed that model weights remained in local system memory throughout the run.', '2026 年 11 月 7 日、ClipsX 0.1.12 上で Extension text generation に Ollama / gemma3:4b を割り当てて検証しました。テスト文章をコピーして Transform → Rewrite → Business を実行し、外部通信なしでローカル生成が完了することを確認。Ollama 側でもモデルの重みが終始ローカルメモリ上で稼働していることを確認しました。'), l('While this check was conducted on Windows, the ClipsX engine and the first-party Rewrite extension share identical core capabilities and extension APIs across Windows, macOS, and Linux. The sample input and output remain in English in both editions so that translation is not conflated with model rewriting.', 'この動作確認は Windows 環境で実施されましたが、ClipsX と公式 Rewrite 拡張機能は Windows、macOS、Linux のすべてで同一の機能と拡張 API を提供します。なお、翻訳と推敲を混同しないよう、日本語版記事でも原文と出力は英語のまま掲載しています。')],
      },
    },
    {
      id: 'set-up-local-generation', title: l('Configure a text generation model, not an embedding model', '埋め込みモデルではなく、テキスト生成モデルを設定する'),
      paragraphs: [l('Rewriting text requires an instruction-tuned chat model rather than an embedding model (which only calculates vector coordinates for Meaning Search). You will need ClipsX, the first-party Rewrite extension, a running Ollama instance, and a pulled LLM. While downloading a model requires an initial internet connection, all subsequent inference runs completely offline on your local machine.', '文章の推敲には、意味検索（Meaning Search）で使われるベクトル埋め込み（Embedding）モデルではなく、指示追従型のチャットモデル（LLM）が必要です。構成要素は ClipsX、公式 Rewrite 拡張機能、起動中の Ollama、およびダウンロード済みのモデルです。モデル取得時のみインターネット通信が発生しますが、その後のテキスト推敲処理はすべてローカル端末内で完結します。')],
      list: { ordered: true, items: [
        l('Install and start Ollama on your system (Windows, macOS, or Linux). Pull a chat model tailored to your hardware (for example, gemma3:4b or llama3.2).', 'お使いの OS（Windows、macOS、Linux）に Ollama を導入して起動します。マシンスペックに合わせて適切なチャットモデル（例: gemma3:4b や llama3.2 など）を取得してください。'),
        l('In ClipsX, navigate to Intelligence → Models. Verify your Ollama endpoint, detect installed models, and configure a chat preset.', 'ClipsX の「Intelligence → Models」を開き、Ollama への接続を確認。検出されたモデルからチャットプリセットを作成します。'),
        l('Assign that preset to "Extension text generation". Ensure this slot is populated even if Meaning Search or Recall is already running.', '作成したプリセットを「Extension text generation」スロットに割り当てます。すでに意味検索や Recall が稼働している場合でも、この割り当ては独立して必要です。'),
        l('Under Extensions, install and enable the first-party Rewrite package, granting it the text generation capability. Always start with manual invocation.', '「Extensions」タブから公式 Rewrite パッケージをインストールして有効化し、テキスト生成の権限を付与します。動作確認はまず手動実行から行いましょう。'),
      ] },
      links: [{label:l('Ollama and model setup', 'Ollama とモデルの設定'),href:'https://docs.clipsx.app/local-ai'}, {label:l('Install and use Rewrite', 'Rewrite の導入と使い方'),href:'https://docs.clipsx.app/extensions'}],
    },
    {
      id: 'run-and-compare', title: l('Generate a suggestion and compare it against the original', '変換を実行し、原文と差分を比較する'),
      paragraphs: [l('With ClipsX active, copy a draft message to capture it into your history. Open the clip details, choose Transform → Rewrite, and pick a preset such as Business or Casual. Use the built-in Compare view to inspect exact differences side-by-side before committing to Copy or Paste.', 'ClipsX が常駐している状態で下書きをコピーし、履歴から該当クリップを開きます。「Transform → Rewrite」から「Business」などのプリセットを選択。生成後、すぐに貼り付けるのではなく「Compare」機能で原文との差分を念入りに確認してください。')],
      table: {
        caption:l('Verification checklist for message rewrites', 'メッセージ推敲時の重要チェック項目'),
        headers:[l('Verification factor', '検証項目'),l('Original requirement', '原文の要件'),l('What to verify', '確認すべきポイント')],
        rows:[
          [l('Deadline', '期限'),l('Thursday at 3:00 PM', '木曜 15:00'),l('Ensure days, times, and deadlines remain strictly unchanged.', '曜日・時間・締め切りが正確に維持されているか')],
          [l('Dependency', '作業の前提'),l('Agenda is required to complete the review', 'レビュー完了に議題が必須'),l('Confirm blocking dependencies are not diluted into casual preferences.', '必須のブロッカー要件が、単なる「できれば希望」に弱められていないか')],
          [l('Commitments', '約束・責任'),l('No unverified promises or apologies', '余計な約束や謝罪を含まない'),l('Check that the model has not fabricated guarantees or unwarranted apologies.', 'モデルが勝手な謝罪や実現不能な約束、合意を捏造していないか')],
        ],
      },
    },
    {
      id:'make-the-final-edit', title:l('Combine model output with quick human edits', 'モデルの提案をもとに、最後は人間が仕上げる'),
      paragraphs:[l('Often, the most effective message is a hybrid. For example: “Could you please send the agenda by Thursday at 3:00 PM? I need it before I can finish the review.” This human revision retains the polite opening generated by the model while cutting the passive, overly bureaucratic ending. AI suggestions serve as a fast sounding board, not an absolute authority.', 'AI の提案をそのまま使うだけでなく、手作業で軽く整えるのが最も効果的です。例えば「Could you please send the agenda by Thursday at 3:00 PM? I need it before I can finish the review.」のように編集すれば、モデルが提案した丁寧な導入を活かしつつ、冗長でまどろっこしい結びを省けます。AI の出力は完成形ではなく、推敲のたたき台として活用するのが理想的です。'),l('ClipsX preserves your original clipboard content alongside transformed versions. Generated rewrites remain attached as child variations of the root clip, while "Save as new clip" creates an independent entry. Automated transform rules can be added later, but starting with manual invocation gives you full visibility into model behavior.', 'ClipsX では、変換結果が生成されても元のクリップが消失することはありません。生成されたバリエーションは元クリップに紐づいた状態で保持され、「Save as new clip」を選べば独立した新しいクリップとして保存できます。自動変換ルールの設定も可能ですが、まずは手動実行でモデルの癖や挙動を把握することをお勧めします。')],
    },
    {
      id:'choose-a-writing-route', title:l('Select the right boundary for text processing', '文章処理の境界とアプローチを選択する'),
      image: {
        src: '/images/blog/local-message-rewrite.webp', width: 1600, height: 900,
        alt: l('A copied draft passes through a local model and a review checkpoint, with the Thursday deadline retained.', '下書きがローカルモデルと確認工程を通り、木曜の期限が保持される流れ。'),
        caption: l('Conceptual illustration of the local workflow. The model proposes wording; review determines the final message.', 'ローカル処理の流れを表す概念図です。モデルが言い回しを提案し、確認して最後の文章を決めます。'),
      },
      paragraphs:[l('A localhost endpoint like localhost:11434 does not inherently guarantee zero data egress if the upstream server proxies requests elsewhere. Always verify that your Ollama installation is running genuine, locally stored weights (such as gemma3:4b). When drafting internal memos, credentials, or sensitive customer communications, strict on-device execution guarantees privacy boundaries that cloud endpoints cannot match.', '接続先が「localhost」であっても、バックエンドが外部 API に中継している構成ではローカル完結とは言えません。使用中のモデル（gemma3:4b など）の重みファイルが確実にローカルストレージへ保存されているか確認してください。社内メモや未公開の顧客情報などを推敲する際、完全なオンデバイス処理はクラウド型サービスにはない厳格なプライバシー境界を提供します。')],
      table:{caption:l('Comparing text transformation workflows', '文章推敲アプローチの比較'),headers:[l('Approach','アプローチ'),l('Infrastructure & Privacy','実行環境とプライバシー'),l('Ideal scenario','適したユースケース')],rows:[
        [l('Manual self-editing','自身による手動編集'),l('Zero setup; purely in your head','事前準備不要・端末内完結'),l('Quick fixes, minor typos, or strictly confidential snippets','軽微な言い回しの修正や、極めて機密性の高い短文')],
        [l('Local Ollama + Rewrite','ローカル Ollama ＋ Rewrite'),l('On-device weights; utilizes local CPU/GPU RAM','端末内の重みを使用・ローカル CPU/GPU リソースを消費'),l('Iterating on tone and phrasing without leaking drafts to external servers','下書きを一切社外へ出さず、クリップボード上で言い換え案を得たいとき')],
        [l('Hosted cloud models','クラウド型ホストモデル'),l('Data sent over HTTPS to third-party provider API','HTTPS 経由で外部プロバイダーへ送信（規約・コストが適用）'),l('Complex reasoning or languages where tiny local models lack nuance','小規模なローカルモデルではニュアンスの表現が難しい複雑な多言語翻訳など')],
      ]},
    },
    {
      id:'when-it-does-not-work', title:l('Troubleshooting: performance, latency, and quality issues', 'トラブルシューティング：動作しない・遅い・意図と異なる場合'),
      paragraphs:[l('When testing a local AI pipeline for the first time, start with a simple plain-text snippet. Remember that local inference latency and memory footprints scale with model parameter count and context window length; on-disk file size does not equal active runtime VRAM/RAM consumption. Text rewriting does not require embedding models or vector index configuration.', 'ローカル AI パイプラインを初めてテストする際は、まず短いプレーンテキストで検証してください。推論速度やメモリ消費量はモデルのパラメータ数やコンテキスト長に左右され、モデルファイルのディスク容量と実行時に必要な VRAM/RAM 容量は一致しません。なお、文章の書き換えにはベクトル索引や埋め込みモデルの設定は不要です。')],
      list:{items:[l('Rewrite menu item missing: Verify that the extension is installed and enabled, text generation permissions are granted, and the clip contains editable text.', 'Rewrite メニューが表示されない場合：拡張機能がインストール・有効化されているか、テキスト生成権限が付与されているか、対象クリップがテキスト形式かを確認してください。'),l('Generation fails or times out: Ensure the Ollama service is active, the targeted model is downloaded, and your chat preset is correctly assigned to "Extension text generation".', '生成に失敗・タイムアウトする場合：Ollama サービスが起動しているか、指定モデルの pull が完了しているか、チャットプリセットが「Extension text generation」に割り当てられているか確認してください。'),l('Output hallucinated or truncated: Revert to your original clip, make manual edits, or experiment with a different temperature or model size. A 200 OK inference response does not guarantee semantic accuracy.', '内容が変わってしまった、あるいは途中で途切れる場合：元のクリップを採用し、手動で修正するか、モデルやプロンプト設定を変更してください。生成処理が正常終了したことと、内容の妥当性は別物です。')]},
      links:[{label:l('Download ClipsX','ClipsX をダウンロード'),href:'/download'},{label:l('Model troubleshooting','モデルのトラブル対応'),href:'https://docs.clipsx.app/local-ai'}],
    },
  ],
  resources:[{label:l('Rewrite setup and result controls','Rewrite の設定と結果の操作'),href:'https://docs.clipsx.app/extensions'},{label:l('Local and hosted model boundaries','ローカル・ホスト型モデルの違い'),href:'https://docs.clipsx.app/local-ai'},{label:l('Published Rewrite 2.0.0 package','公開されている Rewrite 2.0.0'),href:'https://github.com/azure06/clipsx-extensions/releases/tag/rewrite-v2.0.0'}],
};
