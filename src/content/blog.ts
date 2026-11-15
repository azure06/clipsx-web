import { documentationConfig } from '@/config/site';
import type { Locale } from '@/i18n/config';
import { l, pick, type Localized } from './marketing';
import { localMessageRewrite } from './blog-rewrite';

export type BlogLink = { label: Localized; href: string };
export type BlogFlow = {
  caption: Localized;
  steps: { title: Localized; detail: Localized; icon: 'clipboard' | 'search' | 'model' | 'check' }[];
  note: Localized;
};
export type BlogTable = { caption: Localized; headers: Localized[]; rows: Localized[][] };
export type BlogImage = { src: string; width: number; height: number; alt: Localized; caption: Localized };
export type BlogRewriteExample = { caption: Localized; before: Localized; after: Localized; note: Localized };
export type BlogSection = {
  id: string;
  title: Localized;
  paragraphs: Localized[];
  list?: { ordered?: boolean; items: Localized[] };
  table?: BlogTable;
  image?: BlogImage;
  rewriteExample?: BlogRewriteExample;
  details?: { summary: Localized; paragraphs: Localized[] };
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
  image: BlogImage;
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
      l('Every single day, your clipboard handles high-velocity secrets. You copy production database credentials, customer support conversations containing personal addresses, private API tokens, and sensitive internal Slack messages. Keeping this material easily retrievable accelerates your daily workflow, but it also creates a repository of high-value data. The question is not whether this history is useful, but where that history lives and who has access to it.', 'クリップボードには日々、極めて機密性の高い情報が集まります。DBの接続パスワード、顧客の問い合わせ、APIトークン、社内のプライベートなやり取り。これらを後から探せる利便性は作業効率を劇的に高めますが、同時に重要なデータ資産の集積場所にもなります。問題は履歴の有用性ではなく、それがどこに保存され、誰が閲覧できるのかという点です。'),
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
  topic: l("Assistant workflows", "AI アシスタント連携"),
  title: l("Search clipboard history from Codex and Claude Code", "Codex や Claude Code からクリップボード履歴を検索・参照する"),
  description: l("Connect developer assistants like Codex and Claude Code to local clipboard history using MCP. Grant scoped, read-only access to query past clips and verify citations against source evidence.", "Model Context Protocol（MCP）を通じて、Codex や Claude Code をローカルの ClipsX 履歴と接続。読み取り専用の権限で過去のクリップを検索し、回答の根拠を原文と直接照合する方法を解説します。"),
  takeaway: l("Scoped read-only MCP access provides AI assistants with historical context without giving them write permissions. You maintain full granular authority over what gets exposed.", "クリップの検索・参照には、読み取り専用のスコープで十分です。アシスタントに書き込み権限を与えることなく、共有する情報の境界を自分で細かく制御できます。"),
  overview: {
    caption: l("From captured clip to verified assistant response", "保存したクリップから、検証可能な回答を得るまでの流れ"),
    steps: [
      {
        icon: "clipboard",
        title: l("Capture in history", "履歴に自動保存"),
        detail: l("ClipsX records eligible text and screenshots locally.", "ClipsX がテキストや画像をローカル環境へ安全に記録。"),
      },
      {
        icon: "search",
        title: l("Query via MCP", "MCP 経由で検索・取得"),
        detail: l("Your assistant calls search_clips and read_clip.", "許可されたアシスタントが search_clips と read_clip を実行。"),
      },
      {
        icon: "check",
        title: l("Verify ground truth", "原文と突き合わせて検証"),
        detail: l("Audit quotes and citations against the original source.", "アシスタントの回答と引用箇所を、元のクリップと直接照合。"),
      },
    ],
    note: l("The ClipsX MCP endpoint runs strictly on localhost; however, your assistant client may transmit retrieved excerpts upstream to its LLM API provider.", "ClipsX の MCP エンドポイントはローカルホスト上で稼働しますが、アシスタントが取得したテキストを外部の LLM プロバイダーへ送信する可能性がある点に留意してください。"),
  },
  image: { src: '/images/blog/clipboard-mcp.webp', width: 1600, height: 900,
    alt: l('Saved clipboard notes connect through authorized local MCP access to an assistant, which returns a draft with source references.', '保存済みのメモが許可されたローカルMCP接続を通ってアシスタントに渡り、引用元付きの下書きになる流れ。'),
    caption: l('Conceptual workflow: saved clips → authorized retrieval → a draft you can check. These are illustrative scenarios, not customer testimonials.', '概念図：保存済みクリップ → 許可した検索 → 確認できる下書き。利用例は説明用であり、顧客の体験談ではありません。') },
  sections: [
    {
      id: "the-context-you-already-collected",
      title: l("Query historical clipboard data without manual re-pasting", "過去にコピーした資料を、手動で貼り直さずに参照する"),
      paragraphs: [
        l("Rather than digging through dozens of open browser tabs, terminals, and chat windows to manually re-copy snippets into your AI prompt, ClipsX exposes eligible clipboard history directly to Codex and Claude Code. As long as ClipsX is running and the snippet was captured within your retention window, your assistant can retrieve it autonomously.", "過去に参照したログや仕様書、エラーメッセージを探し出して AI チャットへ手動で貼り直す代わりに、ClipsX を使えば Codex や Claude Code から過去のクリップボード履歴を直接検索できます。ClipsX が常駐しており、対象のデータが保持期間内に保存されていれば、アシスタントが必要な文脈を自動取得します。"),
      ],
      table: {
        caption: l("Understanding where your context lives", "参照すべきコンテキストの切り分け"),
        headers: [
          l("Task", "目的・タスク"),
          l("Storage location", "対象の保存場所"),
          l("ClipsX responsibility", "ClipsX の役割"),
        ],
        rows: [
          [
            l("Inspect the most recent clipboard item", "直前にコピーした内容を参照する"),
            l("System clipboard", "OS のクリップボード"),
            l("Passes the active OS clipboard snapshot", "現在アクティブなクリップボードの内容を即座に提供"),
          ],
          [
            l("Retrieve a past snippet, log, or screenshot", "以前コピーしたコード・ログ・画像を探す"),
            l("ClipsX persistent history", "ClipsX の保存済み履歴データベース"),
            l("Performs keyword and semantic search across retained clips", "保持されているクリップ群からキーワード検索や意味検索を実行"),
          ],
          [
            l("Reference a past conversation with your assistant", "過去の AI アシスタントとの会話ログを参照する"),
            l("Assistant conversation logs", "各アシスタント自身のセッション履歴"),
            l("Not applicable (ClipsX manages clipboard data, not client chat threads)", "対象外（ClipsX はクリップボードを管理するツールであり、外部チャット全履歴の索引化は行いません）"),
          ],
        ],
      },
    },
    {
      id: "start-read-only",
      title: l("Establish a scoped, read-only MCP connection", "読み取り専用のアクセス権でクライアントを接続する"),
      paragraphs: [
        l("Connect your preferred developer assistant (such as OpenAI Codex or Anthropic Claude Code) using an isolated, read-only token. Standard keyword search executes instantly using ClipsX's built-in SQLite full-text index without requiring any local AI models; optional semantic search uses local vector embeddings when enabled.", "Codex や Claude Code などの開発アシスタントと接続する際は、クライアントごとに分離された読み取り専用トークンを発行します。通常のキーワード検索は ClipsX 内蔵の SQLite 全文検索で行われるため、AI モデルは不要です。意味検索（Meaning Search）を利用する場合のみ、ローカル埋め込みモデルとベクトル索引の準備が必要となります。"),
      ],
      list: {
        ordered: true,
        items: [
          l("In ClipsX, open Intelligence → Integrations and enable the local Model Context Protocol (MCP) server.", "ClipsX の「Intelligence → Integrations」を開き、ローカル MCP サーバー機能を有効にします。"),
          l("Click \"Add assistant\" and create a distinct, named credential with read-only privileges specifically for your client.", "「Add assistant」をクリックし、クライアントごとに専用の名前付き読み取りアクセス権を発行します。"),
          l("Copy the generated configuration into your client's settings. Never commit authorization tokens to version control or display them in public screenshots.", "画面に表示される設定手順に従ってクライアントに反映します。認証トークンを Git などの共有リポジトリにコミットしたり、画面共有やスクリーンショットに含めないよう注意してください。"),
          l("Restart your assistant client, run \"Test access\" to confirm connectivity, and perform a live query. Note that a successful ping only verifies the connection, not query relevance.", "クライアントを再起動後、「Test access」で接続確認を行い、実際にクエリを試します。接続テストの成功は疎通を確認するものであり、意図通りの検索結果が得られることまでは保証しません。"),
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
      title: l("Test with sample notes and inspect the source evidence", "サンプルのメモを使って、原文の根拠を確認してみる"),
      paragraphs: [
        l("To safely verify how your assistant handles retrieved context, use the two test notes below. These fictional notes are a reader exercise, not observed customer results. Copy each note to your clipboard individually, then verify that both entries appear in your ClipsX History.", "アシスタントが取得したコンテキストをどう扱うか安全に検証するため、以下のテスト用メモを使用します。これらは動作確認用の架空のメモであり、実際の顧客環境で観測された実績値ではありません（not observed customer results）。一つずつクリップボードにコピーし、ClipsX の履歴一覧に両方が登録されたことを確認してください。"),
      ],
      list: {
        items: [
          l("Orion support report: Two concurrent checkout requests time out after 30 seconds under load.", "Orion サポート報告：負荷環境下で決済リクエストを同時に二つ送信すると、30 秒後にタイムアウトが発生する。"),
          l("Orion API note: The default client timeout is 30 seconds. The root cause of the checkout failure is currently unconfirmed.", "Orion API メモ：クライアントの既定タイムアウトは 30 秒。決済失敗の根本原因は現時点で未特定。"),
        ],
      },
      links: [

      ],
    },
    {
      id: "coding-context",
      title: l("Prompt for citations and draft an engineering handoff", "原文を引用させ、確認可能な引き継ぎメモを作成する"),
      paragraphs: [
        l("Instruct your assistant: “Search my clipboard history for the Orion support report and API note. Read both items, cite the direct quotes, and draft a concise engineering handoff outlining observed symptoms and unconfirmed hypotheses.”", "アシスタントに次のように指示します：「クリップボード履歴から Orion のサポート報告と API メモを検索して。両方の内容を読み込み、根拠となる箇所を直接引用した上で、観測された事象と未解決の仮説をまとめた簡潔な引き継ぎメモを作成して。」"),
        l("Inspect your assistant's tool-call trace to confirm that it executed search_clips followed by read_clip. Compare the generated quotes directly against your original clipboard clips. Notice that while both notes reference 30-second thresholds, this coincidence alone does not establish causation, which is a critical distinction that a well-prompted assistant should highlight.", "アシスタントの実行ログを確認し、search_clips と read_clip が適切に呼び出されたことを確かめます。生成された引用文を元のクリップと直接突き合わせてみましょう。どちらのメモにも「30 秒」と記載されていますが、これは相関に過ぎず障害の根本原因を証明するものではありません。推測と客観的事実の境界を意識することが重要です。"),
      ],
    },
    {
      id: "saved-image-context",
      title: l("Retrieve and inspect a saved screenshot via read_clip_image", "保存済みのスクリーンショットを read_clip_image で取得・検証する"),
      paragraphs: [
        l("ClipsX also supports multimodal retrieval through MCP. An authorized assistant can locate past screenshots retained in your clipboard history using OCR text indices or capture metadata, and inspect them via read_clip_image.", "ClipsX は MCP 経由のマルチモーダルな画像取得にも対応しています。過去にクリップボードへ保存されたスクリーンショットを、OCR テキスト索引やメタデータで検索し、read_clip_image ツールで画像プレビューとして参照できます。"),
      ],
      image: {
        src: '/blog/saved-image-retrieved.webp', width: 2048, height: 1297,
        alt: l('Invented checkout interface: a purple Continue button overlaps the email input, with a green circle at upper right and three orange bars at lower left.', '架空の決済画面。紫の Continue ボタンがメール入力欄に重なり、右上に緑の丸、左下に三本のオレンジの棒があります。'),
        caption: l("The image returned by read_clip_image. This invented interface is a test fixture, not a ClipsX product screenshot. Open it for a closer look.", "read_clip_image が返した画像です。架空の検証用画面であり、ClipsX の製品画面ではありません。画像を開くと細部を確認できます。"),
      },
      details: {
        summary: l("Tested environment and benchmark results", "動作確認環境と検証結果"),
        paragraphs: [l("In a controlled benchmark on November 7, 2026, we copied this test interface, replaced the active clipboard with benign text, then retrieved the stored image using search_clips and inspected it with read_clip_image. The returned preview showed the purple button overlapping the email field, a green circle, and three orange bars. This is one controlled check, not a customer result or a WSL test.", "2026 年 11 月 7 日の検証環境において、この検証用画面をコピーした後に別のテキストでクリップボードを上書きし、search_clips で過去の保存画像を検索して read_clip_image でプレビューを取得しました。返されたプレビューには、メール欄に重なる紫のボタン、緑の丸、三本のオレンジの棒が見えました。管理された条件での一回の確認であり、顧客の実績や WSL での検証ではありません。"), l("Local versions: ClipsX 0.1.12; Codex package 26.1103.4239.0; Windows build 26300. This was an already-configured session, not a fresh installation. Search used completed OCR, not visual similarity; OCR availability depends on the platform and setup.", "ローカル環境：ClipsX 0.1.12、Codex パッケージ 26.1103.4239.0、Windows ビルド 26300。設定済みの環境であり、新規インストールの検証ではありません。検索には完了済みの OCR を使い、画像の見た目による類似検索は使っていません。OCR の利用可否は OS や設定に依存します。")],
      },
      list: { ordered: true, items: [
        l('Take a screenshot while ClipsX is active. Verify its appearance in ClipsX History, then copy unrelated text to clear the active clipboard buffer.', 'ClipsX の起動中にスクリーンショットをコピーします。履歴への保存を確認した後、別のテキストをコピーしてアクティブなクリップボードを上書きします。'),
        l('Ask: “Find my saved Orion checkout image. Open the image preview and describe the layout problem. Do not infer its code or cause.” Use your own distinctive text or capture date.', '「保存した Orion の決済画面を探し、画像プレビューを開いて配置の問題を説明して。コードや原因は推測しないで」と依頼します。自分の画像にある固有の文字や保存日を指定してください。'),
        l('Verify that read_clip_image returned the expected asset. Raw OCR text alone cannot determine element layering, coordinates, or colors; visual preview inspection is essential.', 'read_clip_image が目的の画像を正しく返したか確認します。抽出された OCR テキストだけでは要素の重なりや色、座標の衝突は判断できないため、画像プレビューによる視覚的検証が不可欠です。'),
      ] },
      table: {
        caption: l('Choosing the right image input path', '画像コンテキストを渡す最適なルートの選択'),
        headers: [l('Current asset state', '手元の状態'), l('Recommended path', '使う方法'), l('Technical rationale', '選ぶ理由')],
        rows: [
          [l('An image ready to attach immediately', '今すぐ手動添付できる手元の画像'), l('Native client image input', 'クライアント標準の画像入力'), l('Direct upload; bypasses clipboard history storage', '直接添付で十分であり、履歴連携は不要')],
          [l('An earlier screenshot stored in ClipsX', '過去に ClipsX に保存されたスクリーンショット'), l('Saved-history MCP retrieval', '保存済み履歴から MCP 取得'), l('Query and inspect retained screenshots via background OCR', '保持されている画像を OCR 索引や日時で検索・取得可能')],
          [l('A saved local image file for Codex CLI', 'Codex CLI に渡すローカル画像ファイル'), l('The --image CLI option', '--image オプション'), l('Documented first-party file argument for terminal clients', '公式 CLI でサポートされている標準のファイル指定引数')],
          [l('A terminal paste buffer limitation or WSL path issue', 'ターミナルや WSL 環境での画像貼り付け失敗'), l('Client-specific environment troubleshooting', '各クライアント環境のトラブルシュート'), l('MCP retrieval inspects stored history; it does not patch OS paste buffers', 'この手順は保存済み画像の取得を可能にするもので、OS の貼り付け不具合自体を修正するわけではありません')],
        ],
      },
      links: [{ label: l('Official image-input options', '公式の画像入力方法'), href: 'https://learn.chatgpt.com/docs/image-inputs' }],
    },
    {
      id: "research-comparison",
      title: l("Check your client environment and execution context", "クライアントの実行環境とネットワーク境界を確認する"),
      paragraphs: [
        l("MCP client configuration varies based on your execution environment. Desktop applications, command-line interfaces, and virtualized subsystems each handle process inheritance and loopback routing differently.", "MCP クライアントの設定方法は実行環境によって異なります。デスクトップアプリ、CLI ツール、仮想化環境（WSL やコンテナなど）では、プロセスの環境変数継承やローカルループバックアドレスのルーティングがそれぞれ異なります。"),
      ],
      links: [
        {
          label: l("Current client setup instructions and documentation", "各クライアントの最新セットアップ手順"),
          href: "https://docs.clipsx.app/assistant-setup",
        },
      ],
      table: {
        caption: l("Setup requirements by assistant client architecture", "クライアントの実行形態に応じた設定要件"),
        headers: [
          l("Client architecture", "クライアント形態"),
          l("Configuration method", "設定方法"),
          l("Key validation check", "重要な確認ポイント"),
        ],
        rows: [
          [
            l("Codex desktop client", "Codex デスクトップ版"),
            l("Persistent user environment configuration or client settings", "永続的な環境変数またはクライアント設定ファイル"),
            l("Fully terminate background daemon processes before restarting", "バックグラウンドの常駐プロセスを含め完全終了して再起動"),
          ],
          [
            l("Terminal clients (Claude Code / Codex CLI)", "ターミナル型 CLI（Claude Code / Codex CLI）"),
            l("Local HTTP endpoint and bearer token authorization", "ローカル HTTP エンドポイントと Bearer 認証トークン"),
            l("Ensure host loopback networking resolves properly across WSL/containers", "WSL やコンテナからホストの localhost へのネットワーク解決を確認"),
          ],
          [
            l("Remote cloud-hosted LLM assistants", "リモート・クラウド型アシスタント"),
            l("Cannot directly reach local loopback endpoints", "手元のローカル接続先へ直接は到達不可"),
            l("ClipsX runs local-first and intentionally does not open public internet tunnels", "ClipsX は完全ローカル設計であり、クリップボードを外部公開するトンネルは提供しません"),
          ],
        ],
      },
    },
    {
      id: "choose-the-boundary",
      title: l("Audit data boundaries and security permissions", "共有されるデータの境界とセキュリティを確認する"),
      paragraphs: [
        l("Follow the principle of least privilege: issue distinct tokens for each assistant and immediately revoke credentials for decommissioned tools. Read-only retrieval permits querying and inspection, but strictly prevents assistants from creating, modifying, or deleting clips. Be aware that environment-variable tokens reside outside ClipsX's encrypted credential vault.", "最小権限の原則に基づき、アシスタントごとに個別のアクセストークンを発行し、使わなくなった接続は速やかに失効させてください。読み取り専用アクセスではクリップの検索・参照のみが許可され、クリップの作成・編集・削除は一切行えません。なお、OS の環境変数に設定したトークンは、ClipsX の暗号化ボールトの外で管理される点に留意してください。"),
        l("Clips flagged as private or sensitive are excluded from MCP retrieval by default; however, automated classification heuristics cannot guarantee 100% precision. Remember that a failed privacy check does not automatically restrict a clip. When establishing your workflow, test with harmless notes first and review which items are exposed.", "非公開やパスワードなどの機密として分類されたクリップは、MCP 経由の検索から自動的に除外されますが、自動判定がすべての機密情報を完全に検出できるとは限りません。プライバシー判定の処理自体が失敗した場合に、対象のクリップが自動的に非公開制限されるわけではないため（failed privacy check does not automatically restrict a clip）、最初は安全なテスト用メモから運用を開始し、露出範囲を定期的に確認してください。"),
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
      title: l("Troubleshooting retrieval failures and query misses", "トラブルシューティング：目的のクリップが見つからないとき"),
      paragraphs: [
        l("Before debugging your assistant prompt, verify that the clip actually exists inside the ClipsX desktop application. The MCP server queries your local database directly; it cannot retrieve content that was excluded by privacy filters, purged past your retention limit, or copied before ClipsX was running.", "アシスタント側のプロンプトを疑う前に、まず ClipsX のアプリ画面上で該当クリップが存在しているか確認してください。MCP サーバーはローカルの保存済みデータベースを検索するため、除外ルールに引っかかったデータ、保持期限切れで消去されたデータ、ClipsX 起動前にコピーされたデータは取得できません。"),
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
          l("Connection refused or timed out: Confirm the ClipsX background process is active, the MCP integration toggle is on, and your client has been fully restarted after updating its config.", "接続拒否・タイムアウト：ClipsX が起動しているか、MCP 統合機能が有効化されているか、設定更新後にアシスタントクライアントを完全再起動したかを確認。"),
          l("Irrelevant clip retrieved: Narrow your prompt using distinctive keywords, specific timestamps, or the originating application name.", "意図しないクリップがヒットする：固有の専門用語やキーワード、コピーした時間帯、コピー元のアプリケーション名などをプロンプトに指定して絞り込みを実行。"),
          l("Semantic search returns no matches: Check that a valid embedding model is assigned under Intelligence → Models and that vector index generation has finished processing.", "意味検索でヒットしない：「Intelligence → Models」で有効な埋め込みモデルが割り当てられているか、ベクトル索引の作成が完了しているかを確認。"),
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

const windowsClipboardLimit: BlogPost = {
  slug: "windows-clipboard-history-limit",
  date: "2026-11-10",
  topic: l("Windows workflows", "Windows 活用"),
  title: l("Windows 11 clipboard history: the 25-item limit and how to overcome it", "Windows 11 クリップボード履歴の「25件制限」：消える原因と容量不足の解決策"),
  description: l("Windows 11 clipboard history caps out at 25 items, ignores clips over 4 MB, and purges unpinned entries on reboot, with no registry setting to raise the ceiling. Here is how the limit works and what to use when you outgrow it.", "Windows 11 のクリップボード履歴は最大25件で頭打ちになり、4MB超のデータは保存されず、再起動で未ピン留めの項目がすべて消去されます。レジストリや設定で上限を増やす裏技もありません。その仕組みと、制限を気にせず作業するための現実的な解決策を解説します。"),
  takeaway: l("Win+V is a reliable scratchpad for quick copy-pasting, but the 25-item FIFO queue silently drops older clips. When your clipboard serves as an extension of your memory, you need persistent history that survives restarts and offers instant search.", "Win+V は一時的なメモとしては手軽ですが、25件を超えると古いコピーが予告なく押し出されて消えます。過去のコードや参考資料を確実に記憶させておくなら、再起動で消えず、検索も可能な永続的クリップボード管理が必要です。"),
  image: { src: "/images/blog/windows-clipboard-limit.webp", width: 1600, height: 900,
    alt: l("Conceptual architecture diagram comparing the Windows 11 25-item FIFO clipboard buffer against the ClipsX persistent local vault.", "Windows 11 の 25 件 FIFO クリップボードバッファと、ClipsX の永続的ローカル保管庫を対比した概念アーキテクチャ図。"),
    caption: l("Architecture comparison: Windows 11 built-in clipboard history purges older unpinned clips via a 25-item FIFO queue, whereas ClipsX stores complete history locally.", "アーキテクチャ比較：Windows 11 標準のクリップボード履歴は 25 件の FIFO キューで古い項目を自動消去しますが、ClipsX は全履歴をローカルに永続保持します。") },
  sections: [
    {
      id: "the-moment-it-bites",
      title: l("The moment you realize your copied data is gone", "「コピーしたはずの重要データがない」その瞬間の原因"),
      paragraphs: [
        l("It starts with a familiar moment of frustration: you copied a critical SQL query, API response, or server config snippet early this morning. A few hours later, after copying dozens of error logs, Slack messages, and documentation links, you reboot your workstation. You hit Win+V expecting to paste that morning snippet, only to find an empty list or just the few clips you took after restarting.", "「さっきコピーしたはずの重要な SQL クエリや API のレスポンスが見当たらない」という経験はないでしょうか。朝のうちにコピーしたテキストも、その後に何十件ものログや Slack のメッセージ、ドキュメントの URL をコピーし、PC を再起動してから Win+V を押すと、きれいに消え去っています。"),
        l("This isn't a glitch, and you didn't accidentally toggle a hidden switch. This is Windows 11 clipboard history functioning precisely as Microsoft architected it. The native feature operates on a rigid FIFO (First-In, First-Out) rotation buffer with severe storage ceilings. Once you understand these boundaries, you can stop losing work and decide whether the default scratchpad suits your workflow or if you require dedicated clipboard memory.", "これは Windows のバグでも、誤って設定をオフにしたわけでもありません。Microsoft の設計どおりに動いている結果です。Windows 11 標準のクリップボード履歴は、厳格な「先入れ先出し（FIFO）」バッファと厳しい容量制限のもとで動作しています。その仕様を正しく理解すれば、大事なコピーを二度と失わずに済むようになり、標準機能のままで十分か、専用のツールを導入すべきかを明確に判断できます。"),
      ],
    },
    {
      id: "the-limits",
      title: l("The 4 hard limits of Windows 11 clipboard history", "Windows 11 クリップボード履歴の「4大制限」"),
      paragraphs: [
        l("Microsoft documents four specific boundaries for the Windows clipboard subsystem. These limits apply across every Windows 11 PC, regardless of edition (Home, Pro, Enterprise) or hardware specs (whether you have 8 GB or 64 GB of RAM).", "Windows のクリップボード機能には、Microsoft の公式ドキュメントに明記された 4 つの厳格な制限が存在します。これらはエディション（Home、Pro、Enterprise）や搭載メモリ量（8GB でも 64GB でも）に関係なく、すべての Windows 11 PC に一律で適用されます。"),
        l("Crucially, there is no setting, registry key, or Group Policy to raise these thresholds. Searching online often turns up registry myths proposing keys like HistoryLimit under Software\\Microsoft\\Clipboard, but Windows simply ignores them. What ships is a hard-coded system constraint.", "重要なのは、これらの数値を引き上げる裏技が一切存在しないという点です。ネット上にはレジストリを編集して上限を増やすような噂もありますが、Windows 11 にそのような設定キーは存在せず、すべて無視されます。OS のシステムレベルで完全にハードコードされた仕様です。"),
      ],
      table: {
        caption: l("Technical limits of the Windows 11 clipboard buffer", "Windows 11 クリップボード履歴の技術的制限マトリクス"),
        headers: [l("System limit", "制限項目"), l("Underlying mechanism", "動作の仕組み"), l("Workflow consequence", "作業への直接的な影響")],
        rows: [
          [l("25-item capacity cap", "最大 25 件の容量上限"), l("Strict FIFO circular queue: copying item #26 silently drops unpinned item #01", "厳格な FIFO（先入れ先出し）：26件目のコピーで最古の未ピン項目が自動削除"), l("Fast copiers lose morning research, links, and code snippets within hours", "作業中にコピーを重ねると、朝コピーしたメモやコードが数時間で消滅")],
          [l("4 MB per-item limit", "1件あたり 4 MB のサイズ制限"), l("Clips exceeding 4 MB are silently dropped and never recorded in history", "4 MB を超えるデータは履歴に一切記録されず、無視される"), l("High-res screenshots, large logs, and rich graphics fail to persist with zero error dialogs", "高解像度スクリーンショットや長大なエラーログが保存されず、警告も出ない")],
          [l("Volatile RAM storage", "揮発性メモリでの保持"), l("Unpinned entries live in temporary memory and purge on restart or shutdown", "未ピン留めの項目は一時メモリ上にあり、再起動や電源オフで一括消去"), l("Windows updates or routine reboots wipe out your active scratchpad", "Windows Update や急な再起動で、作業中の参照コンテキストが全滅")],
          [l("No registry override", "レジストリや設定での拡張不可"), l("Hard-coded limit in Windows Shell; no Group Policy or registry flag exists", "Windows Shell に固定値として埋め込まれており、ポリシー等で変更不可"), l("Workstation specs cannot compensate; power users must look beyond native Win+V", "PC スペックを上げても解決しないため、ヘビーユーザーには専用ツールが必須")],
        ],
      },
    },
    {
      id: "turn-it-on-and-pin",
      title: l("How to enable Win+V and protect critical clips with pinning", "Win+V の有効化と「ピン留め」による一時防衛策"),
      paragraphs: [
        l("Because clipboard history is disabled by default in clean Windows installations, many users encounter these constraints without realizing the feature exists. Enabling it takes seconds, and pinning is the only built-in mechanism Windows provides to shield an item from both the 25-item FIFO queue and reboot wipes.", "クリーンインストールされた Windows ではクリップボード履歴が既定で無効化されているため、この機能の存在を知らないまま作業している方も珍しくありません。有効化自体は一瞬で完了し、「ピン留め」は 25 件の自動消去や再起動による消滅から項目を守る唯一の標準機能です。"),
        l("Pinned items also survive the 'Clear all' button, making them suitable for fixed boilerplate: meeting room links, recurring email templates, or an active ticket number. However, treat pinning as a small favorite drawer, not a general archive.", "ピン留めした項目は「すべてクリア」を実行しても保護されるため、定期的な定型文やミーティング URL、プロジェクトの受付番号などを一時退避させるのに向いています。ただし、ピン留めはあくまで「お気に入り」用の引き出しであり、本格的なデータ保管庫ではありません。"),
      ],
      list: { ordered: true, items: [
        l("Press Win+V. If clipboard history is currently turned off, click the 'Turn on' button in the popup dialog, or enable it under Settings → System → Clipboard.", "Win+V を押します。履歴が無効になっている場合は「オンにする」ボタンをクリックするか、「設定」→「システム」→「クリップボード」から有効化します。"),
        l("Copy text, screenshots, or formatted text normally. Your clipboard panel will begin retaining up to 25 recent snippets.", "テキストや画像などを通常どおりコピーします。クリップボードパネルに直近 25 件のデータが順次蓄積されていきます。"),
        l("Press Win+V, hover over a snippet you need to protect, and click the pin icon. Pinned clips survive reboots and batch clearances.", "Win+V を開き、保持したい項目のピンアイコンをクリックして固定します。ピン留めされた項目は、再起動や履歴の一括消去でも削除されなくなります。"),
      ] },
    },
    {
      id: "where-pinning-falls-short",
      title: l("Why manual pinning fails for real-world workflows", "ピン留めだけでは実務の壁を越えられない理由"),
      paragraphs: [
        l("Pinning works well when you know with 100% certainty that a piece of information will matter in the future. In practice, you rarely know a snippet was essential until hours or days later: when a teammate asks for that specific link, when a build breaks with the same stack trace, or when you need exact wording from an earlier draft.", "ピン留めが機能するのは、「後で確実に使う」とコピーした瞬間に分かっている一部の情報だけです。しかし実際の業務では、コピーした情報の重要性に気づくのは大抵数時間後や数日後です。同僚にリンクを再送する際や、同じビルドエラーが再発した際、以前の下書きの言い回しが必要になったときには、すでに 25 件の枠から押し出されています。"),
        l("Furthermore, the native Win+V interface does not scale. It lacks text search, tags, and date filtering; finding a pinned item requires slow, manual scrolling through an unindexed visual feed. If you accidentally toggle clipboard history off in Settings, every pinned item is permanently erased with zero recovery option.", "さらに、Win+V の画面は大量の項目を扱うように作られていません。キーワード検索も、タグ付けも、日付による絞り込みも存在せず、目的の項目を目視でスクロールして探す必要があります。また、設定でクリップボード履歴を一度オフにしてしまうと、ピン留めしていた項目も含めてすべて復元不能で消滅します。"),
        l("Cloud clipboard sync also presents major compliance hurdles. While Windows allows cross-device clipboard sync via a personal Microsoft Account, enterprise IT policies frequently disable cloud clipboard synchronization to prevent sensitive credentials and PII from syncing across external servers.", "Microsoft アカウントによるクラウド同期にも注意が必要です。複数デバイス間での同期機能は用意されていますが、データが Microsoft のクラウドサーバーを経由するため、企業のセキュリティポリシーやプライバシー要件によって制限されているケースが少なくありません。"),
      ],
    },
    {
      id: "when-you-need-more",
      title: l("Upgrading from a volatile buffer to durable working memory", "一時バッファから、永続的な「作業の記憶」へアップグレードする"),
      paragraphs: [
        l("The built-in Windows clipboard is adequate as a temporary buffer for immediate copy-pasting across adjacent windows. It breaks down the moment your clipboard becomes an archive of your daily work, especially when losing earlier copies forces you to re-run queries, re-read documentation, or ask colleagues for files you already had.", "Windows 標準のクリップボードは、直前のデータを隣のウィンドウへ移すだけの一時バッファとしては十分です。しかし、クリップボードが日々の作業の文脈や記憶の役割を持ち始めた途端に破綻します。過去のコピーが消えるたびに、SQL を再実行したり、ドキュメントを探し直したり、一度手元にあった資料を他人に聞き直す無駄が発生します。"),
        l("This is where a dedicated local-first clipboard manager becomes indispensable, and why we created ClipsX. Built with an encrypted local SQLite engine, ClipsX retains your complete clipboard history (including code snippets, high-resolution screenshots, files, and formatted text) without arbitrary 25-item limits. When you forget exact words, its on-device Meaning Search uses local AI models to retrieve clips by conceptual meaning without cloud leakage. It is 100% free and open-source for Windows, macOS, and Linux.", "そこで真価を発揮するのが、専用のローカルファースト型クリップボードマネージャーであり、ClipsX が生まれた理由です。ClipsX は暗号化されたローカル SQLite を備え、25件の制限なしにコード、高解像度画像、ファイル、テキストを端末内に永続保存します。正確な文言を忘れても、端末内のローカル AI を用いた「意味検索（Meaning Search）」で内容から瞬時に発掘可能。外部送信のない安全設計で、Windows、macOS、Linux に完全対応したオープンソースソフトウェアです。"),
      ],
      table: {
        caption: l("Feature comparison: Windows 11 Win+V vs. ClipsX", "機能比較：Windows 11 標準（Win+V） vs ClipsX"),
        headers: [l("Feature", "機能・項目"), l("Windows 11 (Win+V)", "Windows 11 標準（Win+V）"), l("ClipsX", "ClipsX")],
        rows: [
          [l("History capacity", "保存容量・件数"), l("Hard-capped at 25 items", "最大 25 件で固定"), l("Unlimited local history (local SQLite)", "無制限に保存（ローカル SQLite）")],
          [l("Reboot persistence", "再起動後の保持"), l("Wiped on restart (unless manually pinned)", "未ピン留めは再起動で全消去"), l("100% persistent across reboots & crashes", "再起動やクラッシュ後も完全保持")],
          [l("Per-clip size ceiling", "1件あたりの容量制限"), l("Drops any payload over 4 MB", "4 MB 超のデータは保存不可"), l("Handles large images, files, and multi-megabyte logs", "大容量画像、ファイル、長文ログも保持")],
          [l("Search & discovery", "検索・参照性"), l("None (manual visual scrolling only)", "検索機能なし（目視スクロールのみ）"), l("Instant fuzzy text search + local AI Meaning Search", "瞬時の全文検索 ＋ ローカル AI 意味検索")],
          [l("Privacy & data boundary", "プライバシーとデータ境界"), l("Sync routes clips through cloud servers", "クラウド同期時に外部サーバーを経由"), l("100% on-device, local encryption, zero tracking", "完全端末内完結・通信不要・ローカル暗号化")],
          [l("Cross-platform support", "対応 OS"), l("Windows 10/11 only", "Windows のみ"), l("Windows, macOS, and Linux", "Windows・macOS・Linux 対応")],
        ],
      },
      links: [
        { label: l("Download ClipsX", "ClipsX をダウンロード"), href: "/download" },
        { label: l("How Meaning Search works", "意味検索の仕組み"), href: "https://docs.clipsx.app/meaning-search" },
      ],
    },
    {
      id: "faq",
      title: l("Frequently asked questions", "よくある質問（FAQ）"),
      paragraphs: [
        l("How many items does Windows 11 clipboard history store? Exactly 25 items. When you copy a 26th item, the oldest unpinned entry is permanently erased from the bottom of the list without any warning or confirmation dialog.", "Windows 11 のクリップボード履歴は何件まで保存できますか？ 正確に 25 件です。26 件目をコピーした瞬間、ピン留めされていない最も古い項目が警告や確認ダイアログなしで完全に消去されます。"),
        l("Why does my clipboard history disappear after restarting my PC? Because Windows stores unpinned clipboard items in temporary volatile memory by design. Only items that you explicitly pin before restarting will survive a reboot or shutdown.", "PC を再起動するとクリップボード履歴が消えるのはなぜですか？ Windows の仕様により、未ピン留めのクリップボード項目は揮発性メモリ上に保持されるためです。再起動前に手動でピン留めした項目だけが再起動後も残ります。"),
        l("Can I increase the Windows 11 clipboard limit via the registry or Group Policy? No. Microsoft does not provide any setting, registry value (such as a DWORD key), or policy to increase the 25-item buffer or the 4 MB per-item limit. To retain more items, you must use a dedicated clipboard manager.", "レジストリやグループポリシーでクリップボード履歴の上限を増やせますか？ 増やせません。25 件の上限や 1 件 4 MB の制限を引き上げる設定やレジストリ値は用意されていません。より多くの履歴を保持するには、専用のクリップボードマネージャーが必要です。"),
        l("Is Windows clipboard history safe for passwords and API keys? Caution is required: any copied credential remains exposed in plain text to anyone who presses Win+V on your unlocked computer. If you must copy secrets, clear history immediately, and remember that pinned credentials survive 'Clear all' until unpinned.", "パスワードや API キーなどの機密情報をコピーしても安全ですか？ 注意が必要です。コピーした内容は、ロックされていない PC で Win+V を押した人なら誰でも閲覧できます。機密情報を扱った後は履歴を消去し、ピン留めした項目は「すべてクリア」でも残るため事前にピンを解除してください。"),
      ],
    },
  ],
  resources: [
    { label: l("Download ClipsX", "ClipsX をダウンロード"), href: "/download" },
    { label: l("Meaning Search setup", "意味検索の設定"), href: "https://docs.clipsx.app/meaning-search" },
    { label: l("ClipsX on GitHub", "GitHub の ClipsX"), href: "https://github.com/azure06/clipsx" },
  ],
};

export const blogPosts: BlogPost[] = [localMessageRewrite, localFirst, meaningSearch, extensions, clipboardMcp, windowsClipboardLimit].sort((a, b) => b.date.localeCompare(a.date));

export function blogText(post: BlogPost, locale: Locale): string {
  return [post.title, post.description, post.takeaway,
    ...(post.overview ? [post.overview.caption, ...post.overview.steps.flatMap(step => [step.title, step.detail]), post.overview.note] : []),
    ...post.sections.flatMap(section => [section.title, ...section.paragraphs, ...(section.list?.items ?? []),
      ...(section.image ? [section.image.caption] : []),
      ...(section.rewriteExample ? Object.values(section.rewriteExample) : []),
      ...(section.details ? [section.details.summary, ...section.details.paragraphs] : []),
      ...(section.table ? [section.table.caption, ...section.table.headers, ...section.table.rows.flat()] : [])])]
    .map(text => pick(text, locale)).join(' ');
}

export function readingMinutes(post: BlogPost, locale: Locale): number {
  const text = blogText(post, locale);
  const units = locale === 'ja' ? Array.from(text.replace(/\s/g, '')).length : text.split(/\s+/).length;
  return Math.max(1, Math.ceil(units / (locale === 'ja' ? 500 : 220)));
}
