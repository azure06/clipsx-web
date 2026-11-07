import { documentationConfig } from '@/config/site';
import type { Locale } from '@/i18n/config';
import { l, pick, type Localized } from './marketing';

export type BlogLink = { label: Localized; href: string };
export type BlogFlow = {
  caption: Localized;
  steps: { title: Localized; detail: Localized; icon: 'clipboard' | 'search' | 'model' | 'check' }[];
  note: Localized;
};
export type BlogTable = { caption: Localized; headers: Localized[]; rows: Localized[][] };
export type BlogSection = {
  id: string;
  title: Localized;
  paragraphs: Localized[];
  list?: { ordered?: boolean; items: Localized[] };
  table?: BlogTable;
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
  overview?: BlogFlow;
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
  description: l("Use local embeddings to find a saved clip by its meaning. Compare search modes, follow the setup checklist, and inspect the original.", "ローカル埋め込みで、保存済みクリップを意味から探します。検索方法の比較、設定手順、原文確認をまとめました。"),
  takeaway: l("Start with exact search. Add Meaning Search when you remember the idea but not the wording; text generation is optional.", "まず文字検索を使い、表現を忘れたときに意味検索を追加します。文章生成の設定は任意です。"),
  overview: {
    caption: l("How local Meaning Search finds a clip", "ローカル意味検索でクリップを見つける流れ"),
    steps: [
      {
        icon: "clipboard",
        title: l("Capture text", "文章を保存"),
        detail: l("Keep eligible clips in your history.", "対象のクリップを履歴に保存します。"),
      },
      {
        icon: "model",
        title: l("Build the index", "索引を作成"),
        detail: l("An installed local model embeds the text.", "導入済みのローカルモデルで埋め込みを作ります。"),
      },
      {
        icon: "search",
        title: l("Find the original", "原文を探す"),
        detail: l("Describe the idea, then inspect the clip.", "覚えている内容で検索し、クリップを確認します。"),
      },
    ],
    note: l("Conceptual workflow for a local model. Similarity suggests candidates; it does not guarantee a relevant or correct result.", "ローカルモデルを使う場合の概念図です。類似度は候補を探す手掛かりであり、関連性や正しさの保証ではありません。"),
  },
  image: { src: '/images/blog/meaning-search.webp', width: 1600, height: 900,
    alt: l('A query and a clipboard card connected through a local processor, alongside an exact-match path.', 'ローカル処理を通じてつながる検索語とクリップ。別に文字一致の経路もあります。'),
    caption: l('Conceptual illustration: related wording and exact text are complementary retrieval paths.', '概念図：意味の近さと文字の一致は、互いを補う検索経路です。') },
  sections: [
    {
      id: "exact-or-meaning",
      title: l("Find a clip without remembering its exact words", "正確な言葉を忘れてもクリップを探す"),
      paragraphs: [
        l("Meaning Search compares your query with indexed, eligible clipboard text. Results depend on the model, language, captured content, and filters.", "意味検索は、検索語と索引化された対象テキストを比較します。結果はモデル、言語、保存内容、絞り込み条件によって変わります。"),
      ],
      table: {
        caption: l("Choose the tool for your task", "目的に合う方法を選ぶ"),
        headers: [
          l("You remember", "覚えているもの"),
          l("Use", "使う機能"),
          l("Needs", "必要なもの"),
        ],
        rows: [
          [
            l("An error code, name, or path", "エラーコード・名前・パス"),
            l("Exact text search", "文字検索"),
            l("Saved searchable text; no AI model", "保存済みの検索可能な文章。AI モデルは不要"),
          ],
          [
            l("The idea, not the wording", "言葉ではなく内容"),
            l("Meaning Search", "意味検索"),
            l("An embedding preset and ready index", "埋め込みプリセットと準備済みの索引"),
          ],
          [
            l("A question across saved notes", "複数のメモについての質問"),
            l("Recall", "Recall"),
            l("A generation model; check citations", "文章生成モデル。引用元の確認も必要"),
          ],
        ],
      },
    },
    {
      id: "what-the-model-does",
      title: l("Embeddings retrieve text; Recall generates answers", "埋め込みは検索、Recall は回答の生成に使う"),
      paragraphs: [
        l("Embeddings help retrieve saved text; they do not write answers. Supported text representations and completed OCR can contribute. This is not general visual image search or a scan of every file. Open the original clip before using its contents.", "埋め込みは保存した文章を探すためのもので、回答の生成は行いません。対応するテキスト形式や完了済み OCR を利用できますが、画像の類似検索や全ファイルの走査ではありません。使う前に原文を開いてください。"),
      ],
    },
    {
      id: "setup",
      title: l("Set up a local Ollama embedding preset", "Ollama のローカル埋め込みプリセットを設定する"),
      paragraphs: [
        l("Install and start Ollama, then download a compatible embedding model for your languages and hardware. ClipsX does not download models for you.", "Ollama を導入・起動し、言語と端末に合う埋め込み対応モデルを取得します。ClipsX がモデルを自動取得するわけではありません。"),
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
        l("Downloading a model needs connectivity. Model size, memory use, indexing time, and query latency vary. Try a few harmless clips first; a larger model does not guarantee better retrieval.", "モデルの取得には通信が必要です。容量、メモリ、索引作成時間、待ち時間は環境で変わります。まず安全な少数のクリップで試してください。大きなモデルほどよい結果になるとは限りません。"),
      ],
      table: {
        caption: l("Check where the selected model processes text", "選択したモデルの処理場所を確認"),
        headers: [
          l("Setup", "構成"),
          l("Processing", "処理場所"),
          l("Your check", "確認点"),
        ],
        rows: [
          [
            l("Installed local Ollama model", "導入済みのローカル Ollama モデル"),
            l("On your device for this local configuration", "このローカル構成では端末内"),
            l("Verify both the loopback connection and model", "ループバック接続とモデルの両方を確認"),
          ],
          [
            l("Hosted provider/model", "ホスト型の接続先・モデル"),
            l("Clipboard text can be sent to the provider", "文章が提供元へ送られる場合があります"),
            l("Explicit permission for hosted background indexing", "外部でのバックグラウンド索引作成には明示的な許可が必要"),
          ],
        ],
      },
    },
    {
      id: "troubleshooting",
      title: l("Try a harmless note, then diagnose missing results", "安全なメモで試し、見つからない原因を調べる"),
      paragraphs: [
        l("As a fictional exercise, save a harmless café note mentioning upstairs seating, power outlets, and space for a group. After indexing, try “a quiet place for our group meeting,” then compare with the exact café name. A match is not guaranteed.", "練習用の架空メモとして、上階の席、電源、グループ用の席があるカフェの説明を保存します。索引作成後に「グループで静かに集まれる場所」と店名で検索し、結果を比べてください。一致は保証されません。"),
        l("Missing results? Check the embedding assignment, enabled sources, filters, searchable text, and indexing failures. OCR depends on platform and configuration. Exact search remains available, but neither mode recovers clips that were never captured or are no longer retained.", "見つからなければ、モデルの割り当て、検索ソース、絞り込み、検索可能な文章、索引の失敗を確認します。OCR は OS や設定に依存します。文字検索は利用できますが、保存・保持されていない内容はどちらの方法でも復元できません。"),
        l("Minimum similarity filters semantic candidates only. Raising it can hide useful clips; the percentage is not a probability of relevance or factual correctness.", "最低類似度は意味検索の候補だけを絞ります。高くしすぎると必要な結果まで隠れます。表示される数値は、関連性や事実の正しさの確率ではありません。"),
      ],
    },
    {
      id: "index-controls",
      title: l("Manage the index without deleting the original clips", "原本を消さずにインデックスを管理する"),
      paragraphs: [
        l("In Intelligence → Indexing, index missing content, retry failures, or rebuild. Model changes prepare a replacement index alongside the active one. Clearing the semantic index preserves original clips and exact search. Removing a model assignment and deleting stored index data are separate actions; read the confirmation before proceeding.", "Intelligence → Indexing で未処理分の索引化、再試行、再構築を行います。モデル変更時は利用中の索引と並行して新しい索引を準備します。意味検索の索引を消しても原本と文字検索は残ります。モデルの割り当て解除と索引データの削除は別の操作なので、確認画面を読んでください。"),
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
  description: l("Connect Codex or Claude Code to saved clipboard history. Start read-only, retrieve one useful clip, and check its source.", "Codex や Claude Code を保存済み履歴に接続。読み取り専用でクリップを探し、原文まで確認します。"),
  takeaway: l("Read-only access is enough to find and quote saved clips. You choose what the assistant can access.", "保存したクリップの検索と引用には、読み取り専用で十分です。アシスタントへ渡す範囲は自分で選びます。"),
  overview: {
    caption: l("From a saved clip to a checked answer", "保存済みクリップから、確認できる回答へ"),
    steps: [
      {
        icon: "clipboard",
        title: l("Save a clip", "コピーを保存"),
        detail: l("ClipsX captures eligible copies.", "ClipsX が対象のコピーを保存します。"),
      },
      {
        icon: "search",
        title: l("Find and read", "検索して原文を読む"),
        detail: l("An authorized assistant retrieves it.", "許可したアシスタントが必要な内容を取得します。"),
      },
      {
        icon: "check",
        title: l("Check the source", "原文と照合"),
        detail: l("Compare the answer with the saved clip.", "回答を保存済みのクリップと照合します。"),
      },
    ],
    note: l("The MCP connection is local. Your assistant may still send retrieved content to its model provider.", "MCP 接続はローカルでも、アシスタントは取得した内容をモデル提供元へ送る場合があります。"),
  },
  image: { src: '/images/blog/clipboard-mcp.webp', width: 1600, height: 900,
    alt: l('Saved clipboard notes connect through authorized local MCP access to an assistant, which returns a draft with source references.', '保存済みのメモが許可されたローカルMCP接続を通ってアシスタントに渡り、引用元付きの下書きになる流れ。'),
    caption: l('Conceptual workflow: saved clips → authorized retrieval → a draft you can check. These are illustrative scenarios, not customer testimonials.', '概念図：保存済みクリップ → 許可した検索 → 確認できる下書き。利用例は説明用であり、顧客の体験談ではありません。') },
  sections: [
    {
      id: "the-context-you-already-collected",
      title: l("Search saved copies without pasting them again", "同じ資料を貼り直さず、保存済みのコピーを探す"),
      paragraphs: [
        l("ClipsX lets a configured Codex or Claude Code client search eligible saved copies. ClipsX must be running, and the content must have been captured and retained.", "設定済みの Codex や Claude Code から、対象の保存済みコピーを検索できます。ClipsX が起動しており、内容が事前に保存・保持されている必要があります。"),
      ],
      table: {
        caption: l("Which history do you need?", "探したいのは、どの履歴？"),
        headers: [
          l("Your task", "探したいもの"),
          l("Look in", "使う場所"),
          l("ClipsX’s role", "ClipsX の役割"),
        ],
        rows: [
          [
            l("Read the latest copy", "直前のコピー"),
            l("Current clipboard", "現在のクリップボード"),
            l("Capture it while running", "起動中に保存"),
          ],
          [
            l("Find an earlier copy", "以前コピーした資料"),
            l("Saved clipboard history", "保存済みの履歴"),
            l("Search and read saved clips", "保存したクリップを検索・参照"),
          ],
          [
            l("Find an old assistant chat", "過去の会話"),
            l("The assistant’s chat history", "アシスタントの会話履歴"),
            l("Does not index every chat", "全会話を自動で索引化する機能ではありません"),
          ],
        ],
      },
    },
    {
      id: "start-read-only",
      title: l("Connect a client with read-only access", "読み取り専用でクライアントを接続する"),
      paragraphs: [
        l("Use a compatible local assistant and its own model. Keyword search needs no AI model inside ClipsX; optional semantic retrieval needs embeddings and a ready index.", "対応するローカルのアシスタントと、そのモデルを使います。ClipsX の文字検索に AI モデルは不要です。意味検索には埋め込みモデルと準備済みの索引が必要です。"),
      ],
      list: {
        ordered: true,
        items: [
          l("In Intelligence → Integrations, enable the local MCP server.", "Intelligence → Integrations でローカル MCP サーバーを有効にします。"),
          l("Choose Add assistant. Create separate named, read-only access for your client.", "Add assistant で、クライアント専用の名前付き読み取りアクセスを作ります。"),
          l("Follow the generated client instructions. Keep tokens out of shared files and screenshots.", "生成されるクライアント設定に従います。トークンを共有ファイルや画像に含めないでください。"),
          l("Restart the client, use Test access, then try a real search. Test access alone does not verify retrieval.", "クライアントを再起動し、Test access の後で実際に検索します。接続テストだけでは取得まで確認できません。"),
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
        l("These fictional notes are a reader exercise, not observed customer results. Copy them separately, then confirm both appear in History.", "次の架空のメモは動作を試すための例で、顧客の実測結果ではありません。一つずつコピーし、両方が履歴にあることを確認してください。"),
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
        l("Ask: “Find my copied Orion report and API note. Read both, quote the evidence, and draft a short handoff with observations and open questions.”", "「コピーした Orion の報告と API メモを探して。両方を読み、根拠を引用し、観測された症状と未解決の疑問を短くまとめて」と依頼します。"),
        l("Check search_clips and read_clip were used, then compare quotations with the originals. Both notes mention 30 seconds; that does not prove the cause of the failure.", "search_clips と read_clip が使われたことを確認し、引用を原文と照合します。両方に 30 秒と書かれていても、障害原因の証明にはなりません。"),
      ],
    },
    {
      id: "research-comparison",
      title: l("Check your client environment", "クライアントの環境を確認する"),
      paragraphs: [

      ],
      links: [
        {
          label: l("Current Windows and client-specific instructions", "Windows と各クライアントの最新手順"),
          href: "https://docs.clipsx.app/assistant-setup",
        },
      ],
      table: {
        caption: l("Setup depends on where the client runs", "クライアントの実行場所で設定は変わります"),
        headers: [
          l("Client", "クライアント"),
          l("Setup", "設定"),
          l("Check", "確認点"),
        ],
        rows: [
          [
            l("Codex desktop on Windows", "Windows の Codex デスクトップ"),
            l("Generated persistent user-environment instructions", "生成されるユーザー環境変数の設定"),
            l("Fully quit, including background processes, then reopen", "バックグラウンドも含め完全終了して再起動"),
          ],
          [
            l("Claude Code", "Claude Code"),
            l("Generated HTTP and authorization instructions", "生成される HTTP 接続・認証の手順"),
            l("Native Windows and WSL are different environments", "Windows ネイティブと WSL は別の環境"),
          ],
          [
            l("Remote/cloud client", "リモート・クラウド"),
            l("Cannot directly reach this local endpoint", "手元のローカル接続先へ直接は到達しません"),
            l("ClipsX does not create a public tunnel", "ClipsX は公開トンネルを作りません"),
          ],
        ],
      },
    },
    {
      id: "choose-the-boundary",
      title: l("Know what the connection shares", "接続で渡る情報と権限を確認する"),
      paragraphs: [
        l("Keep separate access for each assistant and revoke unused access. Read-only retrieval cannot create or organize clips. On Windows, the persistent setup token lives outside ClipsX’s protected credential storage.", "アシスタントごとにアクセスを分け、不要になれば失効させます。読み取り専用ではクリップを作成・整理できません。Windows の設定用環境変数に置くトークンは、ClipsX の保護された認証情報ストレージの外にあります。"),
        l("Secret and private clips are excluded, but detection can miss sensitive content: a failed privacy check does not automatically restrict a clip. Start with harmless notes and review what is captured.", "秘密情報や非公開と分類されたクリップは除外されますが、検出は完全ではありません。プライバシー判定の失敗だけでは制限されないため、安全なメモで試し、保存対象を確認してください。"),
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
        l("Find the item in ClipsX first. The connection cannot recover content that was never captured, was excluded, or is no longer retained.", "まず ClipsX 内で対象を探してください。保存されなかった内容、除外された内容、保持されていない内容は、この接続から復元できません。"),
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
      list: {
        items: [
          l("No connection: check the running app, enabled access, client configuration, and restart.", "接続できない場合：アプリの起動、アクセスの有効化、設定、再起動を確認。"),
          l("Wrong clip: use a distinctive term, capture date, or source application.", "別のクリップが出る場合：固有の語句、コピーした日付、元のアプリで絞り込み。"),
          l("No semantic result: check the embedding assignment and index readiness.", "意味で見つからない場合：埋め込みモデルの割り当てと索引の準備状況を確認。"),
        ],
      },
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
  return [post.title, post.description, post.takeaway,
    ...(post.overview ? [post.overview.caption, ...post.overview.steps.flatMap(step => [step.title, step.detail]), post.overview.note] : []),
    ...post.sections.flatMap(section => [section.title, ...section.paragraphs, ...(section.list?.items ?? []),
      ...(section.table ? [section.table.caption, ...section.table.headers, ...section.table.rows.flat()] : [])])]
    .map(text => pick(text, locale)).join(' ');
}

export function readingMinutes(post: BlogPost, locale: Locale): number {
  const text = blogText(post, locale);
  const units = locale === 'ja' ? Array.from(text.replace(/\s/g, '')).length : text.split(/\s+/).length;
  return Math.max(1, Math.ceil(units / (locale === 'ja' ? 500 : 220)));
}
