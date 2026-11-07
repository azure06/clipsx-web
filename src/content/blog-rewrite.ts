import type { BlogPost } from './blog';
import { l } from './marketing';

export const localMessageRewrite: BlogPost = {
  slug: 'rewrite-work-message-local-ai-windows',
  date: '2026-11-07', modifiedDate: '2026-11-07',
  topic: l('Local AI writing', 'ローカル AI で文章を整える'),
  title: l('Rewrite a work message with local AI on Windows', 'Windows のローカル AI で仕事のメッセージを整える'),
  description: l('Make a copied message clearer with Ollama and ClipsX Rewrite. See an actual suggestion, check what changed, and choose what to paste.', 'Ollama と ClipsX Rewrite で、コピーした文章を整えます。実際の出力例を見ながら変更点を確認し、貼り付ける内容を選びます。'),
  takeaway: l('Use a local chat model to suggest a rewrite. Keep the original, check dates and commitments, then copy or paste deliberately.', 'ローカルのチャットモデルで書き換え案を作ります。原文を残し、日時や約束が変わっていないか確かめてから、コピーや貼り付けを行いましょう。'),
  image: {
    src: '/images/blog/local-message-rewrite.webp', width: 1600, height: 900,
    alt: l('A draft message passes through a local model and a review checkpoint before a final message is chosen.', '下書きがローカルモデルと確認工程を通り、最後に使う文章が選ばれる流れ。'),
    caption: l('Conceptual illustration: generation proposes; you review and choose. This is not a product screenshot.', '概念図：生成モデルが提案し、自分で確認して選びます。製品画面のキャプチャではありません。'),
  },
  overview: {
    caption: l('A rewrite you stay in control of', '自分で確認して使う、文章の書き換え'),
    steps: [
      { icon: 'clipboard', title: l('Copy a draft', '下書きをコピー'), detail: l('Start with a harmless message.', 'まずは安全な文章で試します。') },
      { icon: 'model', title: l('Run Rewrite', 'Rewrite を実行'), detail: l('Use the assigned local chat model.', '割り当てたローカルのチャットモデルを使います。') },
      { icon: 'check', title: l('Compare, then paste', '比較してから貼り付け'), detail: l('Check meaning before using the result.', '意味が変わっていないか確認します。') },
    ],
    note: l('Manual Rewrite does not copy or paste automatically. A completed run still needs your review.', '手動の Rewrite は自動でコピーや貼り付けを行いません。処理が完了しても、内容の確認は必要です。'),
  },
  sections: [
    {
      id: 'a-real-rewrite', title: l('Soften the tone without losing the request', '伝える内容を残して、言い方を整える'),
      paragraphs: [l('On Windows, ClipsX can send a saved text clip to a locally configured Ollama chat model through Rewrite. The example below uses a fictional message and an actual Business-preset result from gemma3:4b.', 'Windows では、保存したテキストを Rewrite から設定済みのローカル Ollama チャットモデルへ渡せます。以下は架空の英語メッセージと、gemma3:4b の Business 設定が実際に返した出力です。')],
      rewriteExample: {
        caption: l('One controlled run, not a promise of identical results', '一回の動作確認で得た例です。同じ出力を保証するものではありません'),
        before: l("You still haven't sent the agenda. Send it by Thursday at 3 pm. I need it before I can finish the review.", "You still haven't sent the agenda. Send it by Thursday at 3 pm. I need it before I can finish the review."),
        after: l('Please send the agenda by Thursday at 3:00 PM to ensure it is available prior to the review completion.', 'Please send the agenda by Thursday at 3:00 PM to ensure it is available prior to the review completion.'),
        note: l('The opening is less accusatory and the deadline remains. The ending is wordier and makes the dependency less direct. Review it rather than accepting it automatically.', '冒頭の責めるような表現は弱まり、期限も残っています。一方で後半は回りくどくなり、「届かないとレビューを終えられない」という関係も間接的です。そのまま採用せず確認してください。'),
      },
      details: {
        summary: l('What was actually tested?', 'どの環境で確認した？'),
        paragraphs: [l('Checked on November 7, 2026, in the installed Windows ClipsX app reporting 0.1.12. We copied the fictional message, selected Transform → Rewrite → Business, and observed a completed result with Ollama / gemma3:4b assigned to Extension text generation. Ollama reported that local model loaded during the run.', '2026 年 11 月 7 日、バージョン 0.1.12 と表示される Windows のインストール済み ClipsX で確認しました。架空の文章をコピーし、Transform → Rewrite → Business を実行。Extension text generation に Ollama / gemma3:4b を割り当てた状態で結果の完了を確認し、Ollama 側でも同じローカルモデルの読み込みを確認しました。'), l('This was one run in an already-configured environment, not a fresh-install or performance benchmark. Public Rewrite 2.0.0 availability was checked separately. The displayed source and output stay in English in both editions so a translation is not mistaken for another model run.', '設定済み環境での一回の確認であり、新規インストールの検証や性能測定ではありません。公開版 Rewrite 2.0.0 の配布は別途確認しました。翻訳を別のモデル出力と誤解しないよう、日本語版でも原文と出力は英語のまま掲載しています。')],
      },
    },
    {
      id: 'set-up-local-generation', title: l('Set up generation, not embeddings', '検索用ではなく、文章生成用のモデルを設定する'),
      paragraphs: [l('You need ClipsX, the optional Rewrite extension, Ollama, and a downloaded chat model. An embedding model used for Meaning Search cannot replace the generation assignment. Initial model downloads require internet access.', 'ClipsX、任意の Rewrite 拡張、Ollama、ダウンロード済みのチャットモデルが必要です。意味検索用の埋め込みモデルは、文章生成の割り当てを代わりに担うものではありません。モデルの初回ダウンロードには通信が必要です。')],
      list: { ordered: true, items: [
        l('Install and start Ollama. Download a local chat model suitable for your device; gemma3:4b is the example here, not a hardware or quality guarantee.', 'Ollama を導入・起動し、端末に合うローカルのチャットモデルを取得します。ここでは gemma3:4b を使いましたが、必要な端末性能や出力品質を保証する指定ではありません。'),
        l('In Intelligence → Models, add or check your Ollama connection, discover the installed model, and create its chat preset.', 'Intelligence → Models で Ollama の接続を追加または確認し、導入済みモデルを検出してチャットプリセットを作ります。'),
        l('Assign that preset to Extension text generation. Check this assignment even if Recall or Meaning Search already works.', 'そのプリセットを Extension text generation に割り当てます。Recall や意味検索が動いていても、この割り当ては別途確認してください。'),
        l('In Extensions, review, install, and enable first-party Rewrite and its generation permission. Start with a manual run.', 'Extensions で提供元の Rewrite と生成権限を確認し、インストール・有効化します。最初は手動で実行してください。'),
      ] },
      links: [{label:l('Ollama and model setup', 'Ollama とモデルの設定'),href:'https://docs.clipsx.app/local-ai'}, {label:l('Install and use Rewrite', 'Rewrite の導入と使い方'),href:'https://docs.clipsx.app/extensions'}],
    },
    {
      id: 'run-and-compare', title: l('Run once, compare with Original', '一度実行して Original と比べる'),
      paragraphs: [l('Copy a harmless draft while ClipsX is running, then open the saved clip. Choose Transform → Rewrite and a setup such as Business. Inspect the result and use Compare to check it against the source before choosing Copy or Paste.', 'ClipsX の起動中に安全な下書きをコピーし、保存されたクリップを開きます。Transform → Rewrite から Business などを選び、結果を確認。Compare で原文と照合してから、Copy や Paste を選びます。')],
      table: {
        caption:l('Checks for this agenda example', '議題の送付を依頼する例での確認点'),
        headers:[l('Check', '確認項目'),l('Original requirement', '原文の要件'),l('What to review', '確認すること')],
        rows:[
          [l('Deadline', '期限'),l('Thursday at 3 pm', '木曜の午後 3 時'),l('Day, time, and any implied timezone', '曜日・時刻・タイムゾーンの解釈')],
          [l('Dependency', '作業の前提'),l('Agenda is needed to finish the review', 'レビューを終えるには議題が必要'),l('Do not weaken this into a preference', '単なる希望に弱まっていないか')],
          [l('Commitments', '約束'),l('No new promise or apology', '新たな約束や謝罪は含まない'),l('Reject invented agreements or guarantees', '勝手に合意や保証を加えていないか')],
        ],
      },
    },
    {
      id:'make-the-final-edit', title:l('A human edit can still be the best next step', '最後は自分で直したほうがよいこともある'),
      paragraphs:[l('A suggested manual edit of this example is: “Could you send the agenda by Thursday at 3 pm? I need it to finish the review.” This is an editorial revision, not another model output. It keeps the dependency explicit and removes the wordier ending.', 'この例を人が整えるなら、「Could you send the agenda by Thursday at 3 pm? I need it to finish the review.」とも書けます。これは編集上の修正案で、追加のモデル出力ではありません。必要な条件を明確に残し、回りくどい後半を短くしています。'),l('Keep the original available while you decide. Attached results remain associated with the source clip; Save as new clip creates an independent clip. Automatic rules are optional and separate from this manual workflow.', '判断する間は原文を参照できる状態にしておきます。添付された結果は元のクリップに紐づき、Save as new clip は独立したクリップを作ります。自動ルールは任意であり、この手動の使い方とは別の設定です。')],
    },
    {
      id:'choose-a-writing-route', title:l('Choose where the rewrite happens', 'どこで文章を整えるか選ぶ'),
      image: {
        src: '/images/blog/local-message-rewrite.webp', width: 1600, height: 900,
        alt: l('A copied draft passes through a local model and a review checkpoint, with the Thursday deadline retained.', '下書きがローカルモデルと確認工程を通り、木曜の期限が保持される流れ。'),
        caption: l('Conceptual illustration of the local workflow. The model proposes wording; review determines the final message.', 'ローカル処理の流れを表す概念図です。モデルが言い回しを提案し、確認して最後の文章を決めます。'),
      },
      paragraphs:[l('A localhost connection alone does not prove device-local inference: Ollama also supports cloud-backed models. Check both the selected connection and the installed model. This guide’s local example used the downloaded gemma3:4b model; other optional services have their own data boundaries.', 'localhost に接続しているだけでは、端末内で処理される証明にはなりません。Ollama はクラウド型モデルにも対応するため、接続先と実際に選んだモデルの両方を確認します。このローカル例では取得済みの gemma3:4b を使用しました。他の任意サービスにはそれぞれ別のデータの境界があります。')],
      table:{caption:l('Three ways to improve a message', 'メッセージを整える三つの方法'),headers:[l('Method','方法'),l('Setup and processing','準備と処理場所'),l('Best reason to choose it','選ぶ理由')],rows:[
        [l('Edit it yourself','自分で編集'),l('No model setup','モデルの設定は不要'),l('A short, obvious change','直す箇所が短く明確なとき')],
        [l('Local Ollama + Rewrite','ローカル Ollama と Rewrite'),l('Installed model; uses device resources','モデルを導入し、端末の資源を使う'),l('A local suggestion within the clip workflow','クリップの操作の中でローカルの提案を得たいとき')],
        [l('Hosted generation model','ホスト型の生成モデル'),l('Provider receives the submitted text; terms and costs vary','送信した文章を提供元が受け取り、条件や費用は異なる'),l('You accept that processing boundary','その処理場所と条件を受け入れるとき')],
      ]},
    },
    {
      id:'when-it-does-not-work', title:l('If Rewrite is missing, slow, or unhelpful', 'Rewrite が出ない、遅い、うまく整わないとき'),
      paragraphs:[l('Start with a short, harmless plain-text clip. Runtime memory and waiting time depend on the model, context, and device; a model download size is not its RAM requirement. There is no need to configure semantic indexing just to rewrite a message.', 'まず短く安全なプレーンテキストで試します。実行時のメモリや待ち時間はモデル、コンテキスト、端末によって変わり、ダウンロード容量は必要な RAM の量ではありません。文章を書き換えるだけなら、意味検索の索引設定は不要です。')],
      list:{items:[l('No Rewrite action: check installation, enablement, permissions, and compatible text input.', '操作が出ない場合：導入、有効化、権限、対応するテキスト入力を確認します。'),l('Generation fails: check Ollama is running, the model is downloaded, and Extension text generation has the intended chat preset.', '生成に失敗する場合：Ollama の起動、モデルの取得、Extension text generation のチャットプリセットを確認します。'),l('The meaning changes or output is unfinished: keep Original, revise manually, or try another setup. A completed run is not a quality certificate.', '意味が変わる、文章が途中で終わる場合：Original を残し、自分で直すか別の設定を試します。処理の完了は品質の保証ではありません。')]},
      links:[{label:l('Download ClipsX','ClipsX をダウンロード'),href:'/download'},{label:l('Model troubleshooting','モデルのトラブル対応'),href:'https://docs.clipsx.app/local-ai'}],
    },
  ],
  resources:[{label:l('Rewrite setup and result controls','Rewrite の設定と結果の操作'),href:'https://docs.clipsx.app/extensions'},{label:l('Local and hosted model boundaries','ローカル・ホスト型モデルの違い'),href:'https://docs.clipsx.app/local-ai'},{label:l('Published Rewrite 2.0.0 package','公開されている Rewrite 2.0.0'),href:'https://github.com/azure06/clipsx-extensions/releases/tag/rewrite-v2.0.0'}],
};
