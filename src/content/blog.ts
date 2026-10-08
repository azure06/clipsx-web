import { documentationConfig } from '@/config/site';
import type { Locale } from '@/i18n/config';
import { l, pick, type Localized } from './marketing';

export type BlogLink = { label: Localized; href: string };
export type BlogSection = {
  id: string;
  title: Localized;
  paragraphs: Localized[];
  list?: { ordered?: boolean; items: Localized[] };
  links?: BlogLink[];
};
export type BlogPost = {
  slug: string;
  title: Localized;
  description: Localized;
  topic: Localized;
  date: string;
  modifiedDate?: string;
  takeaway: Localized;
  image: { src: string; width: number; height: number; alt: Localized; caption: Localized };
  sections: BlogSection[];
  resources: BlogLink[];
};

const localFirst: BlogPost = {
  slug: 'local-first-is-a-data-boundary', date: '2026-09-06',
  topic: l('Privacy', 'プライバシー'),
  title: l('Local-first is a data boundary, not a badge', 'ローカルファーストは飾りではなくデータ境界'),
  description: l('What stays on your device, what an optional account changes, and what to check before connecting a service.', '端末内に残るデータ、任意アカウントの役割、外部サービスを接続する前に確認したいこと。'),
  takeaway: l('Capture, search, and reuse clips without an account. Optional connections have their own data boundaries; choosing them should be a separate decision.', 'アカウントなしで保存・検索・再利用できます。任意の接続先にはそれぞれデータの境界があり、利用するかどうかを個別に選ぶことが大切です。'),
  image: { src: '/images/blog/local-first.webp', width: 1600, height: 900,
    alt: l('Clipboard cards inside a laptop, with separate optional connections outside it.', 'ノートパソコン内のクリップと、その外側に分かれた任意の接続先。'),
    caption: l('Conceptual illustration: local history and optional services are different data paths.', '概念図：端末内の履歴と任意サービスは、別々のデータ経路です。') },
  sections: [
    { id: 'why-the-boundary-matters', title: l('Your clipboard is working memory', 'クリップボードは作業中の記憶'), paragraphs: [
      l('A clipboard history can collect more than useful snippets. A copied command may contain a token. A support conversation may include a customer’s name. A screenshot can capture information you never intended to share. Keeping that material available is convenient, but it also creates a record worth managing deliberately.', '履歴には便利な断片だけでなく、トークンを含むコマンド、顧客名が書かれた問い合わせ、共有するつもりのなかった情報が映るスクリーンショットなども残り得ます。あとで使える便利さとともに、意識して管理したい記録が増えます。'),
      l('For ClipsX, local-first describes where the original record lives. Your desktop app owns its clipboard history on your device. An account is not a prerequisite for capture, ordinary search, or reusing a saved clip. You can start with those everyday tasks before deciding whether any connected feature is useful to you.', 'ClipsX のローカルファーストは、原本の保存場所を表します。履歴は端末内のデスクトップアプリが管理します。保存、通常の検索、再利用にアカウントは不要です。まず日常の作業に使い、接続機能が必要かどうかはあとから判断できます。'),
    ] },
    { id: 'what-stays-local', title: l('History and derived data stay together', '履歴と検索用データは端末内に'), paragraphs: [
      l('Captured content, local notes and tags, and derived search data stay outside settings sync. A search index helps find a clip, but it is not a second cloud copy of your history. Local model configuration and permission grants also remain device-specific rather than roaming with your profile.', '保存した内容、メモ、タグ、検索用の派生データは設定同期の対象外です。検索インデックスはクリップを探すためのもので、クラウドに作る履歴の複製ではありません。モデルの接続設定や権限の許可も、プロフィールと一緒に移動せず端末ごとに保持されます。'),
      l('Local storage is not a backup promise or protection against someone who can access your computer. Your operating system, disk protection, and other software still matter. Keep an independent copy of important work. Clipboard history is useful for retrieving something you copied; it should not be the only place you store a document, credential, or recovery key.', '端末内への保存はバックアップの保証でも、端末にアクセスできる相手への完全な防御でもありません。OS、ディスクの保護、ほかのソフトウェアも関係します。重要な作業は別途保存してください。履歴はコピーしたものを探す手段であり、文書、認証情報、復旧キーの唯一の保存場所には適しません。'),
    ] },
    { id: 'optional-account', title: l('An account moves selected settings', 'アカウントで同期するのは選んだ設定'), paragraphs: [
      l('Optional configuration sync can carry supported preferences such as theme and language, portable shortcuts, and reviewed extension settings. It does not upload clipboard content, notes, tags, files, credentials, or search indexes. Signing out pauses sync while preserving local data. Restoring an extension’s configuration does not transfer its local permission grants.', '任意の設定同期では、テーマや言語などの対応設定、移動可能なショートカット、確認済みの拡張設定を同期できます。履歴、メモ、タグ、ファイル、認証情報、検索インデックスは送信しません。サインアウトすると同期は止まりますが、端末内のデータは残ります。拡張設定を復元しても、その端末での権限許可は引き継ぎません。'),
      l('Settings sync is not end-to-end encrypted; the service can read the synchronized configuration. It is separate from Vault, which is currently unavailable. Neither signing in nor sponsoring the project turns history into cloud storage. Pro billing is not active either. Judge the available feature by what it does today, rather than by a future plan.', '設定同期はエンドツーエンド暗号化ではなく、サービス側が同期設定を読めます。現在利用できない Vault とは別の機能です。サインインやスポンサー支援で履歴がクラウド保存に変わることはありません。Pro の課金も未開始です。将来の予定ではなく、いま利用できる動作を基準に判断してください。'),
    ], links: [{ label: l('What settings sync includes', '設定同期の対象を見る'), href: documentationConfig.sync }] },
    { id: 'connections', title: l('Optional connections deserve their own check', '任意の接続先は個別に確認'), paragraphs: [
      l('With the supported loopback Ollama connection and a locally running model, Meaning Search processes eligible text and queries on your machine. Model downloads still need a connection to obtain the files. Local inference and downloading a model are different activities. Do not assume every model service or every Ollama feature has the same processing location.', '対応するループバック Ollama 接続でローカルモデルを使う場合、意味検索の対象テキストと検索語は端末内で処理します。一方、モデルファイルの取得には通信が必要です。ローカル推論とモデルのダウンロードは別の操作です。すべてのモデルサービスや Ollama の機能が同じ場所で処理するとは限りません。'),
      l('An extension can request host-managed capabilities, including approved network access or model calls. Read what a particular operation needs before granting it access to sensitive input. Local-first is compatible with an explicit external action, but that action can send data outside the device. The destination and purpose should make sense for the task you chose.', '拡張機能は、許可された通信やモデル呼び出しなど、ホストが管理する機能を要求できます。機密性の高い入力を渡す前に、その操作に必要な権限を確認してください。ローカルファーストでも明示的な外部操作は可能ですが、その操作でデータが端末外へ送られることがあります。接続先と目的が、自分の選んだ作業に合っているか確認しましょう。'),
    ] },
    { id: 'practical-controls', title: l('A small privacy routine goes a long way', '日常の小さな確認から'), paragraphs: [
      l('Start with non-sensitive clips and learn how to inspect and delete them. Then review capture preferences, installed extensions, and optional connections. Turn on only what supports your workflow. When contacting support, describe the problem without pasting passwords, tokens, private clips, or recovery keys into the message.', 'まず機密情報を含まないクリップで、内容の確認と削除を試してください。そのあと保存設定、導入した拡張機能、任意の接続先を見直し、必要なものだけ有効にします。サポートへ連絡するときも、パスワード、トークン、私的なクリップ、復旧キーをメッセージに貼らずに状況を説明してください。'),
    ], list: { items: [
      l('Keep important work in its own storage, with a backup you control.', '重要な作業は専用の保存場所に置き、自分で管理するバックアップを用意する。'),
      l('Review permissions again when an extension or its purpose changes.', '拡張機能や用途が変わったら権限を再確認する。'),
      l('Treat local history deletion and hosted account closure as separate actions.', '端末内の履歴削除と、サービスのアカウント閉鎖を別の操作として考える。'),
    ] } },
    { id: 'start-small', title: l('Start with one clip you want to find again', 'あとで探したいクリップをひとつ'), paragraphs: [
      l('You do not need an account, a model, or a purchase to test the core workflow. Copy a useful snippet, find it in ClipsX, and reuse it. Add optional services only when you can name the job they will do for you. For account data, diagnostics, contact messages, and website measurement, read the Privacy page; those paths are distinct from local clipboard storage.', '基本の流れを試すのにアカウント、モデル、購入は不要です。役立つ断片をコピーし、ClipsX で探して再利用してみてください。任意サービスは、何に使うか説明できるようになってから追加すれば十分です。アカウント情報、診断、問い合わせ、サイトの計測についてはプライバシーページをご覧ください。端末内の履歴とは別の経路です。'),
    ] },
  ],
  resources: [
    { label: l('ClipsX Privacy', 'ClipsX のプライバシー'), href: '/privacy' },
    { label: l('Settings sync guide', '設定同期ガイド'), href: documentationConfig.sync },
    { label: l('Ollama: local and cloud processing', 'Ollama：ローカルとクラウドの処理'), href: 'https://docs.ollama.com/faq' },
  ],
};

const meaningSearch: BlogPost = {
  slug: 'meaning-search-with-ollama', date: '2026-09-20', topic: l('Local AI', 'ローカル AI'),
  title: l('Meaning Search, on your machine', '自分の端末で動く意味検索'),
  description: l('Find a clip by the idea you remember. A practical guide to exact search, local embeddings, and Ollama setup.', '覚えている意味からクリップを探す。文字検索との使い分け、ローカル埋め込み、Ollama の設定を解説。'),
  takeaway: l('Keep exact search for precise strings. Add Meaning Search when you remember the idea but not the wording; a local embedding model supplies the extra retrieval path.', '正確な文字列には文字検索を。表現を忘れて意味だけ覚えているときは、ローカル埋め込みモデルを使う意味検索がもうひとつの経路になります。'),
  image: { src: '/images/blog/meaning-search.webp', width: 1600, height: 900,
    alt: l('A query and a clipboard card connected through a local processor, alongside an exact-match path.', 'ローカル処理を通じてつながる検索語とクリップ。別に文字一致の経路もあります。'),
    caption: l('Conceptual illustration: related wording and exact text are complementary retrieval paths.', '概念図：意味の近さと文字の一致は、互いを補う検索経路です。') },
  sections: [
    { id: 'exact-or-meaning', title: l('Sometimes you remember the idea', '覚えているのは言葉より内容'), paragraphs: [
      l('Imagine you copied a café recommendation last week. The clip says “upstairs seating, power outlets, and a peaceful corner,” but today you search for “quiet place to work.” Those words are different. Exact text search is useful when the words match; semantic search can help when the relationship is about the idea. This is an illustrative example, not a promised result.', '先週コピーしたカフェの紹介に「2階の席、電源、落ち着いた一角」と書いてあったとします。今日の検索語は「静かに仕事ができる場所」。文字は一致していません。文字検索は同じ言葉を探すときに便利で、意味検索は内容の関係から探す助けになります。これは説明用の例で、同じ結果を保証するものではありません。'),
      l('For an error code, filename, command, or identifier, keep the exact string. Meaning Search is approximate and should not replace precision when precision is available. ClipsX combines keyword and semantic results, so you can use remembered wording and concepts in the same history without maintaining two separate collections.', 'エラーコード、ファイル名、コマンド、識別子なら正確な文字列を使いましょう。意味検索は近似なので、正確さを求める場面の代わりにはなりません。ClipsX は文字検索と意味検索の結果を組み合わせるため、同じ履歴を言葉と内容の両方から探せます。'),
    ] },
    { id: 'what-the-model-does', title: l('Retrieval, not a generated answer', '答えを生成するのではなく、探す'), paragraphs: [
      l('An embedding model turns text into numerical representations that can be compared. ClipsX builds a derived index from eligible text and compares your query with it. Searchable input includes ready text representations, notes, tags, and completed OCR where available. That makes extracted text searchable; it does not turn the feature into visual image search.', '埋め込みモデルはテキストを比較可能な数値表現に変えます。ClipsX は対象テキストから検索用インデックスを作り、検索語と照合します。準備済みのテキスト表現、メモ、タグ、利用可能で処理済みの OCR が対象です。抽出した文字は探せますが、画像そのものの類似検索ではありません。'),
      l('Meaning Search returns saved clips and matching passages. Recall is a separate feature that uses a generation model to write an answer from retrieved material. You do not need to configure generation to use semantic retrieval. In either case, inspect the original content before using it, especially when a task depends on an exact value or instruction.', '意味検索が返すのは保存済みのクリップと一致箇所です。Recall は別の機能で、検索した資料から文章生成モデルが回答を書きます。意味検索だけなら文章生成の設定は不要です。どちらも、正確な値や手順が重要な作業では、利用前に原文を確認してください。'),
    ] },
    { id: 'setup', title: l('Connect a local embedding model', 'ローカル埋め込みモデルを接続する'), paragraphs: [
      l('Ollama runs separately from ClipsX. Install it and choose an embedding-capable model suitable for your languages and machine. A model that can chat is not automatically an embedding model. ClipsX checks the connected service and model capabilities; it does not install Ollama or silently download a model for you.', 'Ollama は ClipsX とは別に動きます。導入後、使う言語と端末に合った埋め込み対応モデルを選んでください。会話できるモデルが埋め込みにも対応するとは限りません。ClipsX はサービスとモデルの対応機能を確認しますが、Ollama の導入やモデルの無断ダウンロードは行いません。'),
    ], list: { ordered: true, items: [
      l('Install and start Ollama, then install a model that supports text embeddings.', 'Ollama を導入・起動し、テキスト埋め込み対応モデルを導入する。'),
      l('In ClipsX, open Intelligence → Models. Enter the loopback endpoint, normally http://localhost:11434, and choose Connect.', 'ClipsX の Intelligence → Models を開く。通常は http://localhost:11434 のループバック接続先を入力し、Connect を選ぶ。'),
      l('Select an installed embedding-capable model and enable Meaning Search.', '導入済みの埋め込み対応モデルを選び、意味検索を有効にする。'),
      l('Let background indexing prepare eligible clips, then try a concept you remember and inspect the matching passage.', 'バックグラウンドで対象クリップの準備が進んだら、覚えている内容を検索し、一致箇所を確認する。'),
    ] }, links: [{ label: l('Meaning Search setup guide', '意味検索の設定ガイド'), href: documentationConfig.meaningSearch }] },
    { id: 'cost-and-location', title: l('Local processing still uses resources', '端末内の処理にも負荷はかかる'), paragraphs: [
      l('Model files take disk space, and inference uses memory and compute. The initial index also takes time and storage; the amount depends on your history and model. Start with a model your machine can run comfortably. A larger model is not automatically the best choice for your language, typical clips, or patience during indexing.', 'モデルファイルにはディスク容量、推論にはメモリと計算資源が必要です。初回のインデックス構築にも時間と容量がかかり、履歴とモデルによって変わります。まず端末で無理なく動くモデルから試してください。大きいモデルが、自分の言語、クリップ、待てる時間に最適とは限りません。'),
      l('Use the supported loopback connection with a locally running model for on-device processing. Fetching model files requires network access, and Ollama also offers cloud features with different data handling. A localhost address alone is not a reason to assume every model is local. Check the chosen model and Ollama configuration rather than relying on the label “AI.”', '端末内で処理するには、対応するループバック接続とローカルで動くモデルを使います。モデルの取得には通信が必要で、Ollama にはデータの扱いが異なるクラウド機能もあります。localhost というアドレスだけで、すべてのモデルがローカルだとは判断できません。選んだモデルと Ollama の設定を確認してください。'),
    ] },
    { id: 'troubleshooting', title: l('If a result is missing, check the path', '見つからないときは経路を確認'), paragraphs: [
      l('If Ollama is unavailable, ordinary keyword search remains available. Check that the service is running, reconnect in Intelligence, and confirm the selected model is installed and supports embeddings. If only some clips appear, inspect indexing status and narrow filters. OCR text can participate only after extraction has completed.', 'Ollama が利用できなくても文字検索は残ります。サービスの起動、Intelligence での再接続、モデルの導入と埋め込み対応を確認してください。一部しか見つからないなら、インデックスの状態と絞り込み条件を確認します。OCR の文字は抽出完了後に対象になります。'),
      l('Try another description when a semantic match feels wrong. Similarity is a relationship in the model’s embedding space, not a probability that a result is correct. The optional minimum similarity filters semantic candidates only; it does not remove keyword matches. Raising it can hide useful related clips, so change it with a concrete example in mind.', '意味の一致が意図と違うなら、別の表現を試してください。類似度はモデルの空間での関係であり、正解の確率ではありません。任意の最低類似度は意味検索だけを絞り込み、文字検索の一致は除外しません。高くしすぎると役立つ結果も隠れるため、具体的な例で調整しましょう。'),
    ] },
    { id: 'index-controls', title: l('The index is replaceable. Your clips are the original.', '作り直せるインデックスと、残る原本'), paragraphs: [
      l('Changing the embedding model builds a replacement index alongside the active one. An explicit Reindex All is different: it clears the text embedding index and rebuilds it, so semantic results wait for the new index. Both preserve original clips and keyword search. Disabling Meaning Search lets you return to the ordinary workflow without depending on the model.', '埋め込みモデルを変更すると、現在のインデックスと並行して置き換え用を構築します。Reindex All は別の操作で、テキスト埋め込みインデックスを消して作り直すため、意味検索は新しい準備を待ちます。どちらも原本と文字検索は残ります。意味検索を無効にすれば、モデルに依存しない通常の流れへ戻れます。'),
    ] },
  ],
  resources: [
    { label: l('ClipsX Meaning Search setup', 'ClipsX 意味検索の設定'), href: documentationConfig.meaningSearch },
    { label: l('Ollama embeddings documentation', 'Ollama 埋め込みドキュメント'), href: 'https://docs.ollama.com/capabilities/embeddings' },
    { label: l('Ollama local/cloud FAQ', 'Ollama ローカル・クラウド FAQ'), href: 'https://docs.ollama.com/faq' },
  ],
};

const extensions: BlogPost = {
  slug: 'why-clipboard-extensions-need-boundaries', date: '2026-10-04', topic: l('Extensions', '拡張機能'),
  title: l('Why clipboard extensions need boundaries', 'クリップボード拡張に境界が必要な理由'),
  description: l('Make a copied snippet useful without handing every extension unrestricted access. A guide to capabilities, provenance, and consent.', 'コピーした断片を活用するために。拡張機能の権限、配布元、同意の仕組みと、導入前の確認を解説。'),
  takeaway: l('Choose an extension for a specific job, then inspect the access that job needs. Sandboxing and signed packages support that decision; they do not replace it.', '作業に合った拡張機能を選び、その作業に必要なアクセスを確認します。サンドボックスと署名は判断を支えますが、判断そのものの代わりにはなりません。'),
  image: { src: '/images/blog/extension-boundaries.webp', width: 1600, height: 900,
    alt: l('A module inside a permission boundary transforms a clipboard card through gated connections.', '権限の境界内にあるモジュールが、制御された接続を通じてクリップを変換します。'),
    caption: l('Conceptual illustration: useful operations receive specific capabilities through the host.', '概念図：必要な操作は、ホストを通じて特定の機能を利用します。') },
  sections: [
    { id: 'start-with-a-job', title: l('Start with the job, not the package', 'パッケージより、やりたい作業から'), paragraphs: [
      l('You copy a JSON response to inspect an issue. Reading a wall of text is awkward; a structured view or a formatting operation can make it easier to use. That is a good reason for an extension: a specific input, a clear transformation, and an output you can inspect. Installing a collection of tools “just in case” makes the permissions harder to reason about.', '問題を調べるために JSON の応答をコピーしたとします。長い文字列のままでは読みにくく、構造化表示や整形が役立ちます。特定の入力、明確な変換、確認できる出力があることは、拡張機能を使うよい理由です。「いつか使うかも」と大量に導入すると、権限の必要性を判断しにくくなります。'),
      l('ClipsX hosts packaged WebAssembly extensions and, where supplied, sandboxed custom interfaces. Packages contribute operations through a defined host contract. The host controls execution and available capabilities. This gives developers a way to build useful workflows while keeping the access for each operation something the user can evaluate.', 'ClipsX は WebAssembly の拡張パッケージと、提供される場合はサンドボックス内の独自画面を実行します。パッケージは定められたホストの契約を通じて操作を追加し、実行と利用可能な機能はホストが管理します。開発者は便利な作業を作れ、利用者は操作ごとのアクセスを確認できます。'),
    ] },
    { id: 'capabilities', title: l('A capability should have a purpose', '権限には説明できる目的が必要'), paragraphs: [
      l('A formatting operation may need the selected input. A rewrite may also need a generation provider. An integration that sends content somewhere may need permission for a particular network destination or external write. These are different requirements. The name of an extension alone does not tell you whether its operations are offline, model-backed, or connected to another service.', '整形なら選択した入力、書き換えなら文章生成プロバイダー、外部への送信なら接続先や書き込みの許可が必要になることがあります。それぞれ別の要求です。拡張機能の名前だけでは、オフライン操作なのか、モデルを使うのか、別のサービスへ接続するのかは分かりません。'),
      l('Before a run, the host can assess whether an operation applies to the selected clip. That assessment is offline: it cannot use network access, model calls, package state, or output effects. Execution is a separate path with its own requested capabilities. For developers, this separation keeps “can this tool handle the input?” from becoming an unexpected external action.', '実行前にホストは、その操作が選択中のクリップに適用できるか確認できます。この判定はオフラインで、通信、モデル、パッケージ状態、出力効果は使えません。実行は別の経路で、要求する機能も分かれます。開発者にとっても「この入力を扱えるか」という確認が、予期しない外部操作になるのを防ぐ区切りです。'),
    ] },
    { id: 'network-access', title: l('Network access changes the data boundary', '通信するとデータの境界が変わる'), paragraphs: [
      l('Permission-gated networking is useful for an integration, but approved access is still access. If an operation sends selected text to a service, that service receives it. Review the destination, provider, and task before using private or customer material. Start with a harmless sample so you can inspect the result without turning a first experiment into a data-sharing decision.', '権限で制御された通信は連携に役立ちますが、許可されたアクセスであることに変わりはありません。選択した文章をサービスへ送る操作なら、そのサービスが受け取ります。私的な内容や顧客情報を使う前に、接続先、プロバイダー、作業を確認してください。まず無害なサンプルで試せば、初回の実験で機密データを共有せずに結果を確認できます。'),
      l('A local clipboard manager does not make every extension local-only. Equally, an extension does not need network access merely because it is programmable. Look at the concrete capabilities and configuration. Grant what the workflow requires, and choose a simpler operation when you do not need an external connection.', 'ローカルのクリップボードアプリでも、すべての拡張が端末内だけで動くとは限りません。逆に、拡張可能だからといって通信が必須でもありません。具体的な機能と設定を確認し、作業に必要な権限を選びましょう。外部接続が不要なら、より単純な操作を選べます。'),
    ] },
    { id: 'provenance', title: l('A signature identifies a package, not its intentions', '署名はパッケージを確認するもの'), paragraphs: [
      l('The registry uses signed catalog information and archive verification to identify published packages. This helps detect a mismatch between the package you expected and the one being installed. It does not prove that an author’s logic is correct, that an output is appropriate for your task, or that sharing data with a destination is a good choice.', 'レジストリは署名されたカタログ情報とアーカイブ検証を使い、公開パッケージを確認します。期待したものと導入するものの不一致を検出する助けになります。しかし、作者の処理が正しいこと、結果が用途に合うこと、接続先への共有が適切なことまでは証明しません。'),
      l('Keep provenance, permissions, and output review as separate checks. Read the package description and requested capabilities. After running a transformation, inspect the result before copying, pasting, or saving it. For a model-backed operation, also allow for incorrect generated content. A controlled execution environment cannot make every generated statement true.', '配布元、権限、出力は別々に確認してください。説明と要求機能を読み、変換後はコピー、貼り付け、保存の前に結果を確認します。モデルを使う操作なら、生成内容が誤る可能性も考慮しましょう。実行環境を制御しても、生成された文章がすべて正しくなるわけではありません。'),
    ] },
    { id: 'updates-and-controls', title: l('Revisit permissions when the package changes', '変更されたら権限を見直す'), paragraphs: [
      l('An update can change the operation you originally approved. Review requested access when capabilities change, and do not treat a familiar package name as permanent consent. ClipsX keeps permission and update controls in the extension workflow, with recovery and quarantine behavior for failures. Those controls are safeguards, not a reason to skip the review.', '更新で、最初に許可した操作が変わることがあります。機能が変わったら要求されるアクセスを確認し、見慣れた名前を永久的な同意と考えないでください。ClipsX には権限と更新の管理、失敗時の復旧や隔離の仕組みがあります。確認を助ける仕組みであり、確認を省く理由ではありません。'),
      l('Disable an extension when you no longer need it, and review automation separately from manual runs. Automatic work should have a clear trigger and purpose. Transformation outputs belong to their source clip; saving a result as a new clip is an explicit action. Understanding that distinction helps you keep experiments separate from the history you intend to retain.', '不要になった拡張は無効にし、自動実行は手動実行と分けて確認しましょう。自動処理には明確な条件と目的が必要です。変換結果は元のクリップに属し、新しいクリップとして保存するには明示的な操作が必要です。この違いを理解すると、試した結果と残したい履歴を区別できます。'),
    ] },
    { id: 'installation-checklist', title: l('A useful installation checklist', '導入前の確認リスト'), paragraphs: [
      l('The same questions help both users and technical reviewers. You do not need to read the entire implementation to begin; start with the contract and permissions, then inspect the source when the risk or use case calls for it.', '次の質問は、利用者にも技術的なレビュー担当者にも役立ちます。最初から実装全体を読む必要はありません。契約と権限から確認し、用途やリスクに応じてソースを調べてください。'),
    ], list: { items: [
      l('What input does the operation use, and what output should I expect?', 'どの入力を使い、どんな出力が得られるか。'),
      l('Which providers, network destinations, or external writes are requested?', 'どのプロバイダー、接続先、外部書き込みを要求するか。'),
      l('Can I inspect the result and disable the extension or automation?', '結果を確認し、拡張機能や自動処理を無効にできるか。'),
      l('Does the package provenance match, and did an update change its requirements?', '配布元の確認は取れているか。更新で要求が変わっていないか。'),
    ] }, links: [{ label: l('Explore ClipsX extensions', 'ClipsX の拡張機能を見る'), href: '/extensions' }] },
  ],
  resources: [
    { label: l('Extension user guide', '拡張機能の利用ガイド'), href: documentationConfig.extensions },
    { label: l('Extension developer contract', '拡張機能の開発契約（英語）'), href: documentationConfig.developerExtensions },
    { label: l('ClipsX source code', 'ClipsX のソースコード'), href: 'https://github.com/azure06/clipsx' },
  ],
};

export const blogPosts: BlogPost[] = [localFirst, meaningSearch, extensions].sort((a, b) => b.date.localeCompare(a.date));

export function blogText(post: BlogPost, locale: Locale): string {
  return [post.title, post.description, post.takeaway, ...post.sections.flatMap(section => [section.title, ...section.paragraphs, ...(section.list?.items ?? [])])]
    .map(text => pick(text, locale)).join(' ');
}

export function readingMinutes(post: BlogPost, locale: Locale): number {
  const text = blogText(post, locale);
  const units = locale === 'ja' ? Array.from(text.replace(/\s/g, '')).length : text.split(/\s+/).length;
  return Math.max(1, Math.ceil(units / (locale === 'ja' ? 500 : 220)));
}
