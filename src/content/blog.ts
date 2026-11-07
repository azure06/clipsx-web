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
    { id: 'why-the-boundary-matters', title: l('Your clipboard is your working memory', 'クリップボードは作業中の記憶そのもの'), paragraphs: [
      l('Every single day, your clipboard handles high-velocity secrets. You copy production database credentials, customer support conversations containing personal addresses, private API tokens, and sensitive internal Slack messages. Keeping this material easily retrievable accelerates your daily workflow, but it also creates a repository of high-value data. The question is not whether this history is useful—it is where that history lives, and who has access to it.', 'クリップボードには日々、極めて機密性の高い情報が集まります。DBの接続パスワード、顧客の問い合わせ、APIトークン、社内のプライベートなやり取り。これらを後から探せる利便性は作業効率を劇的に高めますが、同時に重要なデータ資産の集積場所にもなります。問題は履歴の有用性ではなく、それがどこに保存され、誰が閲覧できるのかという点です。'),
      l('In ClipsX, “local-first” is an architectural boundary, not a marketing slogan. Your clipboard history is owned and stored entirely on your local machine by the desktop application. You do not need to create an account, enter an email, or connect to a cloud service to capture, search, or reuse clips. The core workflow operates completely offline from day one, ensuring your working memory stays on your hardware.', 'ClipsX において「ローカルファースト」はマーケティングの標語ではなく、明確なデータ境界の設計です。クリップボード履歴はデスクトップアプリが端末内だけで保持・管理します。保存、検索、再利用にアカウント登録やメールアドレス、クラウド連携は一切不要です。最も重要な作業の記憶を、物理的に自分の端末内に留めます。'),
    ] },
    { id: 'what-stays-local', title: l('What stays strictly on your machine', '端末内に留まるデータとその境界'), paragraphs: [
      l('Captured clipboard snippets, personal notes, tags, OCR text, and semantic search indexes never touch cloud servers. When you run search or build text embeddings, those derived representations stay on your local disk. ClipsX does not maintain a shadow cloud copy of your history. Model configurations, local inference paths, and extension permission grants are also pinned strictly to your physical device rather than roaming across devices.', '保存したクリップ、手動のメモやタグ、OCRで抽出した文字、検索用の埋め込みインデックスはクラウドへ送信されません。検索用データは端末内で生成・管理され、履歴の複製が外部に作られることはありません。モデルの接続先や権限の許可設定も、端末ごとの環境として独立して保持されます。'),
      l('Local storage provides physical isolation, but it does not replace operational hygiene. Local-first is not an automatic cloud backup, nor does it protect your files if someone gains administrative access to your physical workstation. Use your operating system’s disk encryption (such as FileVault or BitLocker) and maintain independent, controlled backups of essential documents. Clipboard history is an index for retrieval, not an archive for permanent storage.', '端末内での保管は物理的な隔離を提供しますが、運用上の安全管理を代替するものではありません。ローカル保存は自動バックアップの保証ではなく、端末自体へ不正アクセスされた場合の万能な盾でもありません。OSのディスク暗号化を活用し、重要なデータは独立したバックアップを確保してください。履歴は作業の参照点であり、唯一の保管庫ではありません。'),
    ] },
    { id: 'optional-account', title: l('An optional account syncs preferences, not clips', 'アカウントで同期するのは設定のみ'), paragraphs: [
      l('If you choose to sign in, configuration sync is limited to lightweight, portable preferences. This includes your chosen UI theme, language settings, custom keyboard shortcuts, and approved extension configurations. It explicitly excludes clipboard text, images, notes, tags, credentials, and search indices. Signing out instantly pauses sync while leaving your local clipboard history intact.', 'アカウント機能を利用する場合でも、同期されるのはテーマ、言語設定、ショートカット、確認済みの拡張設定といった環境設定のみに限定されます。クリップの内容、画像、メモ、認証情報、検索インデックスは同期対象外です。サインアウトすれば同期は即座に停止し、ローカルの履歴データはそのまま残ります。'),
      l('Settings sync is not an end-to-end encrypted vault; the synchronization service reads your serialized configuration preferences. It is completely independent from the historical Vault feature, which remains unavailable. Signing in or supporting the project does not convert your history into cloud storage, and paid Pro billing is not active. Judge ClipsX by the concrete software running on your desktop today, rather than future cloud roadmaps.', '設定同期はエンドツーエンド暗号化された保管庫ではなく、設定情報の受け渡しを目的とした通信です。過去に検討された Vault 機能とは異なり、サインインやスポンサー登録によって履歴がクラウドへ保存されることはありません。課金機能も未開始です。将来の構想ではなく、現在手元で動作している実際の動作に基づいてご判断ください。'),
    ], links: [{ label: l('What settings sync includes', '設定同期の対象を見る'), href: documentationConfig.sync }] },
    { id: 'connections', title: l('External connections require explicit choices', '外部接続は個別の判断が必要'), paragraphs: [
      l('When you enable Meaning Search using the supported loopback Ollama connection, all embedding generation and query processing execute entirely on your CPU or GPU. However, downloading the model weights initially requires an external internet connection. Local inference and remote asset downloads are distinct activities; never assume that every AI service or every Ollama endpoint runs purely offline without verifying its network configuration.', '対応するループバック接続で Ollama を利用する場合、埋め込み計算や検索語の照合は端末の CPU や GPU で完結します。ただし、初期のモデルファイルのダウンロードには通信が必要です。端末内での推論とファイル取得の通信は別の処理です。すべての AI 機能が無条件で完全オフラインであると思い込まず、通信先を確認しましょう。'),
      l('Extensions and integrations can also request external network access or model provider capabilities. Before granting network permissions to any tool, verify the destination endpoint and data handling policy. While a local-first application ensures your base history remains offline, an explicit external action can transmit selected text. The destination and purpose of that transmission should align with the sensitivity of the data you handle.', '拡張機能や外部連携は、承認された通信やモデルの利用を要求できます。機密性の高いテキストを渡す前に、通信先のホスト名と利用規約を必ず確認してください。基盤となる履歴がローカルに保たれていても、明示的に許可した外部操作はデータを外へ送信します。送信先と目的が自分の用途に合っているか見極めましょう。'),
    ] },
    { id: 'practical-controls', title: l('A practical routine for clipboard privacy', '日常の小さなプライバシー習慣'), paragraphs: [
      l('Build a deliberate clipboard routine by starting with non-sensitive clips. Practice searching, organizing, and permanently deleting history entries. Regularly review capture settings, installed extension permissions, and active connections, keeping only what directly supports your immediate workflow. When filing a bug report or requesting support, describe symptoms without pasting private tokens, credentials, or customer data into messages.', 'まずは日常の安全なクリップで、内容の確認、検索、個別削除の操作を試してください。その上でクリップの保存設定、導入済み拡張機能、外部接続を見直し、必要な機能だけを有効化します。不具合の報告やサポートへの問い合わせ時も、パスワードや秘密トークン、個人情報を本文に含めず状況を伝える習慣をつけましょう。'),
    ], list: { items: [
      l('Keep critical production keys and recovery seeds in dedicated, encrypted password managers.', '重要な本番認証情報や復旧キーは、専用の暗号化パスワードマネージャーで管理する。'),
      l('Periodically re-evaluate extension capabilities whenever a tool or workflow requirement changes.', '拡張機能の用途や運用方針が変わったときは、付与したアクセス権限を再点検する。'),
      l('Remember that clearing local desktop history and closing an optional cloud account are independent actions.', '端末内の履歴削除と、クラウド上のアカウント閉鎖は別個の操作であることを認識する。'),
    ] } },
    { id: 'start-small', title: l('Begin with a single useful clip', 'まずは一つのクリップから始める'), paragraphs: [
      l('Testing local-first productivity does not require an account, an AI model, or a subscription. Simply copy a command or note you frequently use, search for it inside ClipsX, and paste it back into your work. Add optional connections or local models only when you have a clear, specific job for them. For details on account data, telemetry, and website measurement, consult our Privacy Policy, which outlines boundaries separate from local storage.', 'ローカルファーストの使い勝手を試すのに、アカウント作成や課金、モデルの設定は必要ありません。普段使うコマンドやメモをコピーし、ClipsX で検索して貼り直してみてください。外部連携は必要性を実感してから追加すれば十分です。サイトの計測や問い合わせに関する詳細は、ローカル履歴と区別されたプライバシーポリシーをご確認ください。'),
    ] },
  ],
  resources: [
    { label: l('ClipsX Privacy', 'ClipsX のプライバシー'), href: '/privacy' },
    { label: l('Settings sync guide', '設定同期ガイド'), href: documentationConfig.sync },
    { label: l('Ollama: local and cloud processing', 'Ollama：ローカルとクラウドの処理'), href: 'https://docs.ollama.com/faq' },
  ],
};

const meaningSearch: BlogPost = {
  slug: "meaning-search-with-ollama",
  date: "2026-09-20",
  modifiedDate: "2026-11-07",
  topic: l("Local AI", "ローカル AI"),
  title: l("Search clipboard history by meaning with Ollama", "Ollama でクリップボード履歴を意味から検索する"),
  description: l("Find saved clips when you remember the idea, not the wording. Configure an Ollama embedding preset, enable Meaning Search, and check the original result.", "正確な言葉を忘れても、覚えている意味から保存済みのクリップを探します。Ollama の埋め込み設定、意味検索の有効化、原文確認の手順を紹介します。"),
  takeaway: l("Use exact text search for identifiers and Meaning Search for related ideas. An embedding model and a ready index add the semantic retrieval path; a generation model is not required.", "識別子には文字検索、覚えている内容には意味検索を使い分けます。埋め込みモデルと準備済みのインデックスがあれば意味による検索を追加でき、文章生成モデルは不要です。"),
  image: { src: '/images/blog/meaning-search.webp', width: 1600, height: 900,
    alt: l('A query and a clipboard card connected through a local processor, alongside an exact-match path.', 'ローカル処理を通じてつながる検索語とクリップ。別に文字一致の経路もあります。'),
    caption: l('Conceptual illustration: related wording and exact text are complementary retrieval paths.', '概念図：意味の近さと文字の一致は、互いを補う検索経路です。') },
  sections: [
    {
      id: "exact-or-meaning",
      title: l("Find a clip without remembering its exact words", "正確な言葉を忘れてもクリップを探す"),
      paragraphs: [
        l("ClipsX can search eligible saved clipboard text by meaning with a configured embedding model. Use it when you remember what a note was about but not its exact wording. For a local setup, choose an installed Ollama embedding model and let ClipsX build its index. The model’s language support and your captured content affect what it finds.", "ClipsX は、設定した埋め込みモデルを使って、対象の保存済みテキストを意味から検索できます。メモの内容は覚えているのに、正確な言葉が思い出せないときに使います。ローカルで試すには Ollama の導入済み埋め込みモデルを選び、インデックスの作成を待ちます。見つかる内容は、モデルの対応言語や保存済みの文章によって変わります。"),
        l("Keep exact text search for error codes, names, paths, and function identifiers. A conceptual match is approximate and may be less useful than the precise string you already know. Meaning Search adds another retrieval source; it does not replace the original clip or make a matching passage correct.", "エラーコード、名前、パス、関数名には文字検索を使います。意味による一致は近似的で、正確な文字列を知っているなら、その文字列で探す方が適している場合があります。意味検索は検索経路を追加する機能であり、保存した原文を置き換えたり、その内容の正しさを保証したりするものではありません。"),
      ],
    },
    {
      id: "what-the-model-does",
      title: l("Embeddings retrieve text; Recall generates answers", "埋め込みは検索、Recall は回答の生成に使う"),
      paragraphs: [
        l("An embedding model turns text into numerical representations that can be compared for similarity. ClipsX builds a derived index from eligible searchable text. Supported clip representations and available text artifacts can contribute; completed OCR may supply text from images when available. This is not general visual image search or a search of every document on your computer.", "埋め込みモデルは、類似度を比較できる数値表現へ文章を変換します。ClipsX は検索対象のテキストから派生インデックスを作成します。対応するクリップ形式や利用可能なテキストが対象となり、対応環境で OCR が完了していれば画像内の文字も利用できます。画像そのものの類似検索や、端末内の全書類を調べる機能とは異なります。"),
        l("Meaning Search returns saved clips for you to inspect. Recall can generate an answer from retrieved evidence and needs a separately configured generation model. You can try semantic retrieval without setting up generated answers. In either case, open the original source before using a command, relying on a specification, or sharing its contents.", "意味検索は、確認できる保存済みクリップを返します。Recall は取得した資料から回答を生成する機能で、別に設定した文章生成モデルを必要とします。回答生成を設定せずに意味検索だけを試すこともできます。どちらを使う場合も、コマンドの実行や仕様の判断、内容の共有をする前に原文を確認してください。"),
      ],
    },
    {
      id: "setup",
      title: l("Set up a local Ollama embedding preset", "Ollama のローカル埋め込みプリセットを設定する"),
      paragraphs: [
        l("Install and start Ollama using its official instructions, and download an embedding-capable model suitable for your languages and hardware. ClipsX does not download models for you. Use the current setup guide for your release; an example model name alone does not establish compatibility.", "Ollama の公式手順に従って導入・起動し、使用する言語と端末に適した埋め込み対応モデルをダウンロードします。ClipsX がモデルを自動取得するわけではありません。配布版に対応する最新の手順を使い、モデル名の例だけで互換性を判断しないでください。"),
      ],
      list: {
        ordered: true,
        items: [
          l("In Intelligence → Models, add your local Ollama connection and a text-embedding preset.", "Intelligence → Models で、ローカル Ollama の接続とテキスト埋め込みプリセットを追加します。"),
          l("In Usage & defaults, assign that preset to Semantic search.", "Usage & defaults で、そのプリセットを Semantic search に割り当てます。"),
          l("Open Intelligence → Indexing and check progress, eligible content, and failures.", "Intelligence → Indexing で、進行状況、対象の内容、失敗した処理を確認します。"),
          l("Enable the Meaning Search source in the clipboard search source controls.", "クリップボード検索のソース設定で、Meaning Search を有効にします。"),
          l("Wait for the relevant content to be indexed, then compare an exact query with a conceptual one.", "対象の内容がインデックス化されたら、固有の語句と意味を表す語句で検索結果を比べます。"),
        ],
      },
      links: [
        {
          label: l("Current Meaning Search setup", "意味検索の最新設定手順"),
          href: "https://docs.clipsx.app/meaning-search",
        },
        {
          label: l("Local model setup and recovery", "ローカルモデルの設定と復旧"),
          href: "https://docs.clipsx.app/local-ai",
        },
      ],
    },
    {
      id: "cost-and-location",
      title: l("Check the model, processing location, and workload", "モデル・処理場所・負荷を確認する"),
      paragraphs: [
        l("For on-device processing, use a supported loopback Ollama connection with a model that runs locally. Check the selected provider and model rather than inferring privacy from the word local in an app description. Hosted models and services have a different data path; hosted background indexing requires explicit permission to send clipboard text to that provider.", "端末内で処理するには、対応するループバック Ollama 接続と、実際にローカルで動くモデルを使います。アプリの説明に「ローカル」とあるだけで判断せず、選択中の接続先とモデルを確認してください。ホスト型モデルの処理経路は別であり、外部でのバックグラウンド索引作成には、その提供元へクリップの文章を送る明示的な許可が必要です。"),
        l("Model downloads require connectivity. Disk space, memory use, indexing time, and query latency vary by model, hardware, and the amount of text. Start with a small representative set of your own harmless clips and evaluate useful matches. There is no universal model size or millisecond response time, and a larger model does not guarantee better retrieval.", "モデルのダウンロードには通信が必要です。容量、メモリ使用量、索引作成時間、検索の待ち時間は、モデル、端末、テキスト量で変わります。まず安全な少数のクリップで、必要な結果が得られるか確かめてください。どの環境でも同じ容量や数ミリ秒で動くという保証はなく、大きなモデルほど検索に適するとも限りません。"),
      ],
    },
    {
      id: "troubleshooting",
      title: l("Try a harmless note, then diagnose missing results", "安全なメモで試し、見つからない原因を調べる"),
      paragraphs: [
        l("As a fictional exercise, copy a note about a café with upstairs seating, power outlets, and room for a group. Confirm the clip appears in History and is indexed, then try “a quiet place for our group meeting.” It may appear despite different wording. Compare with an exact café name and inspect the original text; this is not a promised ranking or a measured result.", "説明用の練習として、上階の席、電源、グループ用の席があるカフェについて安全なメモをコピーします。履歴と索引を確認してから、「グループで静かに集まれる場所」と検索してみてください。違う表現でも候補に出る場合があります。店名による文字検索と比べて原文を確認します。この例は、順位や実測結果の保証ではありません。"),
        l("If results are missing, check the embedding assignment, enabled search sources, filters, and indexing status. A clip needs searchable text; OCR availability depends on the platform and configuration. Try fewer constraints or a simpler query. Exact text search remains available when semantic retrieval is unavailable, but it cannot recover a clip that was never captured or is no longer retained.", "見つからなければ、埋め込みモデルの割り当て、有効な検索ソース、絞り込み、索引の状態を確認します。検索可能なテキストが必要であり、OCR の利用可否は OS や設定に依存します。条件を減らすか、検索語を簡単にしてください。意味検索が使えなくても文字検索は利用できますが、保存されていない内容や保持されていないクリップは復元できません。"),
        l("The optional minimum similarity filters semantic candidates, not exact text matches. A stricter threshold can hide useful related results. Similarity expresses closeness in the chosen model’s embedding space, not the probability that a clip is relevant or factually correct.", "任意の最低類似度は意味検索の候補を絞り込むもので、文字一致の結果には影響しません。厳しいしきい値によって、関連する候補まで隠れる場合があります。類似度は選択したモデルの空間での近さを表し、関連性や事実の正しさの確率ではありません。"),
      ],
    },
    {
      id: "index-controls",
      title: l("Manage the index without deleting the original clips", "原本を消さずにインデックスを管理する"),
      paragraphs: [
        l("Use Intelligence → Indexing to index missing content, retry failures, or rebuild. Changing embedding models builds a replacement alongside the existing active index; wait for readiness before comparing results. Clearing or rebuilding the semantic index preserves original clips and exact search. Clearing the semantic-search assignment stops embedding, while removing stored index data is a separate action. Read the app’s confirmation before choosing either.", "Intelligence → Indexing で未処理の内容を索引化し、失敗した処理の再試行や再構築を行えます。埋め込みモデルの変更時は、利用中の索引を残して新しい索引を準備するため、比較は準備完了を待ってください。意味検索の索引を削除・再構築しても、原本と文字検索は保持されます。割り当ての解除と保存済み索引の削除は別の操作なので、確認画面を読んで選んでください。"),
      ],
    },
  ],
  resources: [
    {
      label: l("ClipsX Meaning Search setup", "ClipsX の意味検索設定"),
      href: "https://docs.clipsx.app/meaning-search",
    },
    {
      label: l("Local model setup", "ローカルモデルの設定"),
      href: "https://docs.clipsx.app/local-ai",
    },
    {
      label: l("Ollama embeddings documentation", "Ollama の埋め込みドキュメント"),
      href: "https://docs.ollama.com/capabilities/embeddings",
    },
    {
      label: l("Ollama local/cloud FAQ", "Ollama のローカル・クラウド FAQ"),
      href: "https://docs.ollama.com/faq",
    },
  ],
};

const extensions: BlogPost = {
  slug: 'why-clipboard-extensions-need-boundaries', date: '2026-10-04', topic: l('Extensions', '拡張機能'),
  title: l('Why clipboard extensions need boundaries', 'クリップボード拡張に境界が必要な理由'),
  description: l('You copy API tokens, customer records, and private messages every day. Here is how WebAssembly sandboxing lets you format and transform snippets without leaking your clipboard.', 'APIトークンや顧客情報を含むクリップボード。WebAssemblyサンドボックスで機密漏洩を防ぎながら安全に拡張機能を動かす仕組みを解説。'),
  takeaway: l('Your clipboard holds high-value secrets. Run extensions for specific jobs inside an isolated WebAssembly sandbox, and treat network access as an explicit boundary decision.', 'クリップボードには機密情報が集まります。拡張機能は独立したWebAssembly環境で動かし、通信権限は慎重に判断することが重要です。'),
  image: { src: '/images/blog/extension-boundaries.webp', width: 1600, height: 900,
    alt: l('A module inside a permission boundary transforms a clipboard card through gated connections.', '権限の境界内にあるモジュールが、制御された接続を通じてクリップを変換します。'),
    caption: l('Conceptual illustration: useful operations receive specific capabilities through the host.', '概念図：必要な操作は、ホストを通じて特定の機能を利用します。') },
  sections: [
    { id: 'start-with-a-job', title: l('Your clipboard holds your company’s secrets', 'クリップボードは機密の宝庫'), paragraphs: [
      l('Think about the last five things you copied. A production database URL with embedded credentials. A customer support conversation containing personal emails. A messy JSON blob from an API call that you want to format into readable text. Installing a community plugin to pretty-print that JSON is convenient, but in traditional desktop tools, that plugin often runs with full system privileges. One unvetted dependency can quietly siphon every copied password to a remote server.', '直近でコピーした5つの内容を思い出してください。パスワード入りのDB接続URL、顧客の個人情報、読みにくいJSON。整形プラグインの導入は便利ですが、従来のデスクトップ環境では拡張機能に全権限が与えられがちです。悪意ある依存関係がひとつ紛れ込むだけで、コピーした機密が知らぬ間に外部サーバーへ送信されるリスクがあります。'),
      l('ClipsX rejects the “trust all plugins” approach. Every extension runs inside an isolated WebAssembly sandbox with a host-enforced boundary. The host controls execution lifecycle and available capabilities. Instead of granting blanket machine access, each extension receives only the specific clip you select, with zero hidden access to your wider history, filesystem, or operating system.', 'ClipsX は「プラグインを無条件に信用する」設計を採用しません。すべての拡張機能は隔離された WebAssembly サンドボックス内で動作し、ホストが実行と権限を制御します。システム全体への無制限アクセスを許さず、選択したクリップの入力だけを渡し、履歴全体やファイルへの不正アクセスを防ぎます。'),
    ] },
    { id: 'capabilities', title: l('Declare capabilities, not blanket permissions', '権限は包括的ではなく操作ごとに'), paragraphs: [
      l('A formatting operation only needs an in-memory string buffer. A code translation tool may need access to an approved language model. An issue exporter needs permission to reach a single webhook URL. These are fundamentally different operations with very different risk profiles. The name or category of an extension should never be an excuse for unchecked system access.', 'JSON整形ならメモリ上の文字列バッファだけで十分です。コード翻訳なら承認済みモデルへのアクセス、課題作成ツールなら特定のWebhook先への通信権限が必要です。これらはリスクの性質が全く異なります。拡張機能の名前や見た目の便利さだけで、無制限の権限を与えてはなりません。'),
      l('Before execution, ClipsX evaluates whether an operation applies to the active clip completely offline. That pre-flight check has zero access to network sockets, background state, or model APIs. Execution runs on a separate, capability-gated path. For developers and users alike, this ensures that simply inspecting an input never triggers an unexpected network transmission or background side effect.', '実行前に、ClipsX は対象の操作がクリップに適用できるかを完全オフラインで判定します。この事前確認では通信やモデル呼び出しは一切行われません。実際の実行は権限で保護された別の経路で行われます。これにより、入力を確認するだけで予期せぬ通信が発生する事故を確実に防ぎます。'),
    ] },
    { id: 'network-access', title: l('Network access is an explicit data boundary', '外部通信はデータ境界を超える行為'), paragraphs: [
      l('Permission-gated networking enables valuable third-party integrations, but approved access is still external transmission. The moment an extension sends formatted text to a cloud endpoint, that data is subject to external retention and privacy policies. Before processing sensitive customer records or proprietary code, inspect the exact destination hostname and provider requirements.', '権限で制御された通信は外部サービス連携に役立ちますが、端末外へデータを送信することに変わりはありません。クラウドへ送られたデータは外部のプライバシー方針に従います。機密情報や顧客データを扱う前に、接続先のホスト名とプロバイダーの信頼性を必ず確認してください。'),
      l('A local-first clipboard manager does not make external connections magically offline. Conversely, a programmable tool does not need internet access just because it performs complex transforms. Test new extensions with harmless synthetic snippets first. If a task only requires text manipulation, choose an offline WebAssembly transform that leaves network capabilities disabled entirely.', 'ローカルファーストのアプリを使っていても、外部通信を許可すればデータは外へ出ます。一方で、複雑な処理を行う拡張であっても必ずしも通信が必要なわけではありません。まずは無害なサンプルデータで動作を確認し、テキスト整形など不要な場合は通信権限を遮断したまま使いましょう。'),
    ] },
    { id: 'provenance', title: l('A signature verifies identity, not intention', '署名は作成者の証明であり安全の保証ではない'), paragraphs: [
      l('The ClipsX registry uses cryptographic signatures and catalog hashes to guarantee package authenticity. This ensures that the code downloaded onto your computer exactly matches what the author published, preventing man-in-the-middle tampering. However, a valid cryptographic signature does not guarantee that the author’s business logic is bug-free or safe for your company’s compliance requirements.', 'ClipsX のレジストリは暗号署名とハッシュ検証を用いてパッケージの真正性を確認します。これによりダウンロード時の改ざんやなりすましを検知できます。しかし、正当な署名があるからといって、作者の処理ロジックに脆弱性がないことや、組織のセキュリティ基準を満たしていることまでは保証されません。'),
      l('Treat provenance and runtime sandboxing as complementary defenses. Package provenance tells you who built the tool; the WebAssembly sandbox ensures that tool cannot exceed its granted boundaries. Always inspect transformed outputs before pasting them into production environments, and remember that even model-backed operations require human review before executing sensitive commands.', '配布元の検証と実行時のサンドボックスは、別々の多層防御として捉えてください。署名は「誰が作ったか」を証明し、サンドボックスは「何ができるか」を物理的に制限します。変換結果を本番環境へ貼り付ける前に必ず目視で確認し、モデルによる出力も過信しない運用が大切です。'),
    ] },
    { id: 'updates-and-controls', title: l('Guard against silent update drift', '更新による権限拡大を見逃さない'), paragraphs: [
      l('Supply chain attacks frequently target trusted packages: an innocent utility gets acquired or updated, and a new version quietly adds aggressive telemetry. ClipsX monitors extension manifests and flags capability expansions during updates. Familiarity with a tool’s name should never grant permanent, unmonitored consent for newly requested permissions.', 'サプライチェーン攻撃では、広く信頼されたプラグインが買収や更新によって不正な通信を追加される事例が後を絶ちません。ClipsX は拡張機能の更新時にマニフェストを監視し、新たな権限要求を検出して警告します。以前から使っているツールであっても、追加された権限には常に目を配る必要があります。'),
      l('Keep your extension library lean. Disable utilities you no longer use, and distinguish manual, one-off transformations from automated background triggers. In ClipsX, automated runs require explicit rule matching, and outputs remain tied to the parent clip rather than overwriting your original history. This structure keeps experimental workflows cleanly separated from your verified record.', '導入する拡張機能は必要最小限に保ちましょう。使わなくなったツールは無効化し、手動実行と自動実行の条件を区別して管理します。ClipsX では自動処理に明確なトリガーが必要で、変換結果は原本クリップに紐づけて保持されます。これにより作業履歴を安全に保ちながら実験できます。'),
    ] },
    { id: 'installation-checklist', title: l('The four-step vetting checklist', '導入前の4つの確認ステップ'), paragraphs: [
      l('Whether you are a developer reviewing an open-source tool or an engineer setting up your daily workspace, run through these four practical checks before enabling any new clipboard extension:', '日々の作業で新しいクリップボード拡張を導入する際は、開発者であっても一般ユーザーであっても、次の4つの実用的な確認リストを習慣にしてください。'),
    ], list: { items: [
      l('What exact input does this transform need, and does it produce an inspectable local output?', 'その操作はどの入力を使い、確認可能な出力がローカルで得られるか。'),
      l('Does the extension request network endpoints, model providers, or file writes that its core task does not require?', '本来の用途に不要な外部通信、モデル呼び出し、ファイル書き込みを要求していないか。'),
      l('Can you test the tool with a synthetic sample clip and revoke its permissions immediately if needed?', '無害なサンプルデータで安全にテストでき、不要時にすぐ権限を遮断できるか。'),
      l('Is the package cryptographically signed, and have its required capabilities remained unchanged since your last review?', '暗号署名が一致しているか。アップデートによって新たな権限が追加されていないか。'),
    ] }, links: [{ label: l('Explore ClipsX extensions', 'ClipsX の拡張機能を見る'), href: '/extensions' }] },
  ],
  resources: [
    { label: l('Extension user guide', '拡張機能の利用ガイド'), href: documentationConfig.extensions },
    { label: l('Extension developer contract', '拡張機能の開発契約（英語）'), href: documentationConfig.developerExtensions },
    { label: l('ClipsX source code', 'ClipsX のソースコード'), href: 'https://github.com/azure06/clipsx' },
  ],
};

const clipboardMcp: BlogPost = {
  slug: "connect-your-assistant-to-clipboard-with-mcp",
  date: "2026-10-25",
  modifiedDate: "2026-11-07",
  topic: l("Assistant workflows", "アシスタントの活用"),
  title: l("Search clipboard history from Codex and Claude Code", "Codex や Claude Code からクリップボード履歴を検索する"),
  description: l("Find previously copied notes and errors through ClipsX MCP. Set up read-only access, check Windows client requirements, and inspect the original clips.", "ClipsX の MCP 接続で、コピー済みのメモやエラーを探します。読み取り専用の設定、Windows クライアントの注意点、原文の確認手順を紹介します。"),
  takeaway: l("Connect your assistant to saved clipboard history with read-only access. Ask it to search, read the matching clips, and cite the evidence before using the answer.", "アシスタントを読み取り専用で履歴に接続し、検索したクリップの原文を確認させます。回答を使う前に、引用された内容が元のクリップと一致するか確かめてください。"),
  image: { src: '/images/blog/clipboard-mcp.webp', width: 1600, height: 900,
    alt: l('Saved clipboard notes connect through authorized local MCP access to an assistant, which returns a draft with source references.', '保存済みのメモが許可されたローカルMCP接続を通ってアシスタントに渡り、引用元付きの下書きになる流れ。'),
    caption: l('Conceptual workflow: saved clips → authorized retrieval → a draft you can check. These are illustrative scenarios, not customer testimonials.', '概念図：保存済みクリップ → 許可した検索 → 確認できる下書き。利用例は説明用であり、顧客の体験談ではありません。') },
  sections: [
    {
      id: "the-context-you-already-collected",
      title: l("Search saved copies without pasting them again", "同じ資料を貼り直さず、保存済みのコピーを探す"),
      paragraphs: [
        l("Codex and Claude Code can search eligible saved clipboard history through ClipsX’s local MCP server after you configure the client and grant access. That lets you ask for a copied API note or error message while working on code. ClipsX must be running, and the material must already have been captured and retained.", "クライアントの設定とアクセス許可を済ませると、Codex や Claude Code は ClipsX のローカル MCP サーバーを通じて、対象の保存済み履歴を検索できます。コードを書きながら、コピーした API メモやエラーを探す用途です。ClipsX が起動しており、対象の内容が事前に保存・保持されている必要があります。"),
        l("Saved clipboard history is different from the current system clipboard and from an assistant’s conversation history. A tool that reads only your latest copy cannot necessarily find yesterday’s notes. ClipsX exposes search and source-reading tools for its saved clips; it does not automatically inspect every browser tab, application, or file on your computer.", "保存済みのクリップボード履歴、現在のクリップボード、アシスタントの会話履歴は別のものです。直前のコピーを読むだけのツールでは、昨日のメモまで探せるとは限りません。ClipsX は保存したクリップの検索と原文の読み取りを提供し、ブラウザの全タブやアプリ、ファイルを自動で調べるわけではありません。"),
      ],
    },
    {
      id: "start-read-only",
      title: l("Connect a client with read-only access", "読み取り専用でクライアントを接続する"),
      paragraphs: [
        l("You need ClipsX, a compatible local assistant client, and access to that client’s own model. Keyword search needs no AI model inside ClipsX. Optional meaning-based retrieval needs an embedding model and a ready index; a ClipsX generation model is not required just to share saved context through MCP.", "ClipsX、対応するローカルのアシスタントクライアント、そのクライアントが使うモデルを用意します。ClipsX 内の AI モデルはキーワード検索には不要です。意味による検索には埋め込みモデルと準備済みのインデックスが必要ですが、MCP で履歴を渡すだけなら ClipsX の文章生成モデルは使いません。"),
      ],
      list: {
        ordered: true,
        items: [
          l("Open Intelligence → Integrations in ClipsX and enable the local MCP server.", "ClipsX の Intelligence → Integrations を開き、ローカル MCP サーバーを有効にします。"),
          l("Choose Add assistant, select your client template, and create separate named, read-only access for that client.", "Add assistant でクライアントのテンプレートを選び、そのクライアント専用の名前付き読み取りアクセスを作成します。"),
          l("Follow the generated setup instructions for your operating system and client. Keep tokens and completed setup commands out of screenshots and shared project files.", "OS とクライアントに合わせて表示される設定手順に従います。トークンや入力済みの設定コマンドを、画像や共有ファイルに含めないでください。"),
          l("Restart the client as instructed, use Test access, then try an actual search. Test access checks authentication and tool discovery, not the whole client workflow.", "指示に従ってクライアントを再起動し、Test access の後に実際の検索を試します。接続テストは認証とツール一覧の確認であり、クライアント全体の動作確認とは異なります。"),
        ],
      },
      links: [
        {
          label: l("Client setup and first retrieval", "クライアント設定と最初の検索"),
          href: "https://docs.clipsx.app/assistant-setup",
        },
      ],
    },
    {
      id: "support-handoff",
      title: l("Try two harmless notes and inspect the evidence", "安全な二つのメモで原文まで確認する"),
      paragraphs: [
        l("Use the following fictional notes as a reader exercise. They are not observed customer results, and the matching timeout is not a diagnosis. Copy each note separately with ClipsX running, then confirm both appear in History before asking your assistant to retrieve them.", "次の架空のメモを、動作を試すための例として使います。顧客の実測結果ではなく、タイムアウトの値が一致しても原因の診断にはなりません。ClipsX を起動して一つずつコピーし、アシスタントに尋ねる前に、両方が履歴にあることを確かめてください。"),
      ],
      list: {
        items: [
          l("Orion support report: two concurrent checkout requests time out after 30 seconds.", "Orion サポート報告：決済リクエストを同時に二つ送ると、30 秒後にタイムアウトする。"),
          l("Orion API note: the default client timeout is 30 seconds. The cause of the checkout failure is not confirmed.", "Orion API メモ：クライアントの既定タイムアウトは 30 秒。決済エラーの原因は確認されていない。"),
        ],
      },
      links: [

      ],
    },
    {
      id: "coding-context",
      title: l("Ask for the source, then draft the handoff", "原文を確認してから引き継ぎを作る"),
      paragraphs: [
        l("Ask: “Find my copied Orion support report and API note. Read both clips, quote the relevant evidence, and draft a short engineering handoff with observations and open questions.” A distinctive project name gives keyword search a useful starting point. Add a capture date or application when you need to narrow similar results.", "「コピーした Orion のサポート報告と API メモを探して。両方のクリップを読み、関連する原文を引用して、観測された症状と未解決の疑問を短い開発引き継ぎにまとめて」と依頼します。固有の案件名はキーワード検索の手掛かりになります。似た結果が多ければ、コピーした時期やアプリも伝えてください。"),
        l("Check that the assistant uses search_clips and read_clip before treating a snippet as evidence. Compare its quotations with the original clips in ClipsX. Both sample notes mention 30 seconds, but neither proves the failure’s cause. A useful handoff preserves that uncertainty instead of inventing an explanation or a source URL.", "アシスタントが検索結果の抜粋だけで判断せず、search_clips と read_clip を使っているか確認します。引用を ClipsX の原文と照合してください。例のメモはどちらも 30 秒に触れていますが、障害原因は証明していません。原因や出典 URL を補ってしまわず、不明点を残した引き継ぎが必要です。"),
      ],
    },
    {
      id: "research-comparison",
      title: l("Windows, Codex desktop, and Claude Code setup", "Windows・Codex デスクトップ・Claude Code の設定"),
      paragraphs: [
        l("For Codex desktop on Windows, follow the generated persistent user-environment instructions, then fully quit and reopen Codex, including background processes. Opening another chat alone does not refresh its environment. That persistent token value lives outside ClipsX’s protected credential storage. Keep it private, and use the setup view’s troubleshooting before recreating access.", "Windows の Codex デスクトップでは、表示されるユーザー環境変数の設定に従い、バックグラウンドのプロセスも含めて Codex を完全終了してから起動し直します。新しいチャットを開くだけでは環境変数は更新されません。このトークンは ClipsX の保護された認証情報ストレージの外に保存されるため、共有せず、問題があればアクセスを作り直す前に設定画面の案内を確認してください。"),
        l("For Claude Code, use its generated HTTP configuration and authorization instructions. Native Windows, WSL, and cloud-hosted clients are different environments; do not assume one configuration works everywhere. A remotely hosted assistant cannot directly reach your computer’s loopback endpoint. ClipsX does not create a public tunnel.", "Claude Code では、専用に生成される HTTP 接続と認証の手順を使います。Windows ネイティブ、WSL、クラウド上のクライアントは異なる環境であり、同じ設定で動くとは限りません。別のコンピューター上のアシスタントから、手元のループバック接続先へ直接接続することはできません。ClipsX は公開トンネルを作成しません。"),
      ],
      links: [
        {
          label: l("Current Windows and client-specific instructions", "Windows と各クライアントの最新手順"),
          href: "https://docs.clipsx.app/assistant-setup",
        },
      ],
    },
    {
      id: "choose-the-boundary",
      title: l("Know what the connection shares", "接続で渡る情報と権限を確認する"),
      paragraphs: [
        l("Read-only access supports retrieval without permission to create or organize clips. Keep a separate access entry for each assistant and revoke access you no longer use. The MCP connection is local, but the external assistant may send retrieved text to its hosted model provider. Local transport does not make that model processing local.", "読み取り専用であれば、クリップの作成や整理を許可せずに検索できます。アシスタントごとにアクセスを分け、不要になったものは失効させてください。MCP 接続自体がローカルでも、外部アシスタントは取得した文章をモデルの提供元へ送信する場合があります。通信の入口がローカルであることと、モデルの処理が端末内で完結することは別です。"),
        l("Secret and private clips are excluded from assistant retrieval, but detection can miss sensitive material: a failed privacy check does not automatically restrict a clip. Start with harmless content and review your capture and classification choices. A missing source, an old copied specification, or an assistant’s confident wording still needs your judgment.", "秘密情報や非公開と分類されたクリップは外部アシスタントの検索対象から除外されます。ただし検出は完全ではなく、プライバシー判定の失敗だけで内容が制限されるわけではありません。安全な内容で試し、保存・分類の設定を確認してください。出典がない文章、古い仕様、断定的な回答も、そのまま正しいとは判断できません。"),
      ],
      links: [
        {
          label: l("Privacy checks and failure behavior", "プライバシー判定と失敗時の動作"),
          href: "https://docs.clipsx.app/decision-models#failed-checks",
        },
      ],
    },
    {
      id: "retrieval-troubleshooting",
      title: l("If the assistant cannot find the clip", "クリップが見つからないとき"),
      paragraphs: [
        l("First find the item in ClipsX itself. If it was never captured, was excluded, or is no longer retained, this connection cannot recover it. For connection failures, check that ClipsX is running, access is enabled, and the client has restarted with the right configuration. Try a distinctive exact term before a broad conceptual request.", "まず ClipsX 自体で対象が見つかるか確かめます。保存されていない内容、保存対象から除外された内容、保持されていない内容を、この接続から復元することはできません。接続できない場合は ClipsX の起動、アクセスの有効化、設定後のクライアント再起動を確認し、曖昧な依頼より先に固有の語句で検索してください。"),
        l("If keyword search works but meaning-based retrieval does not, check the embedding assignment and index readiness. Search results are leads, not proof that the assistant chose the right clip. Start free with ClipsX, save one useful note, and verify one retrieval before building a larger workflow around it.", "文字検索は動くのに意味で探せない場合は、埋め込みモデルの割り当てとインデックスの準備状況を確認します。候補が返っても、正しいクリップが選ばれた証明にはなりません。無料の ClipsX で一つのメモを保存し、一回の検索と原文確認を試してから、用途を広げてください。"),
      ],
      links: [
        {
          label: l("Download ClipsX", "ClipsX をダウンロード"),
          href: "/download",
        },
        {
          label: l("Meaning Search setup", "意味検索の設定"),
          href: "https://docs.clipsx.app/meaning-search",
        },
      ],
    },
  ],
  resources: [
    {
      label: l("MCP setup, permissions, and troubleshooting", "MCP の設定・権限・トラブル対応"),
      href: "https://docs.clipsx.app/assistant-setup",
    },
    {
      label: l("Meaning Search setup", "意味検索の設定"),
      href: "https://docs.clipsx.app/meaning-search",
    },
    {
      label: l("Privacy and external connections", "プライバシーと外部接続"),
      href: "https://docs.clipsx.app/privacy",
    },
  ],
};

export const blogPosts: BlogPost[] = [localFirst, meaningSearch, extensions, clipboardMcp].sort((a, b) => b.date.localeCompare(a.date));

export function blogText(post: BlogPost, locale: Locale): string {
  return [post.title, post.description, post.takeaway, ...post.sections.flatMap(section => [section.title, ...section.paragraphs, ...(section.list?.items ?? [])])]
    .map(text => pick(text, locale)).join(' ');
}

export function readingMinutes(post: BlogPost, locale: Locale): number {
  const text = blogText(post, locale);
  const units = locale === 'ja' ? Array.from(text.replace(/\s/g, '')).length : text.split(/\s+/).length;
  return Math.max(1, Math.ceil(units / (locale === 'ja' ? 500 : 220)));
}
