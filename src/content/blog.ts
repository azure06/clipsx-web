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
  slug: 'meaning-search-with-ollama', date: '2026-09-20', topic: l('Local AI', 'ローカル AI'),
  title: l('Meaning Search, on your machine', '自分の端末で動く意味検索'),
  description: l('Find a clip by the idea you remember. A practical guide to exact search, local embeddings, and Ollama setup.', '覚えている意味からクリップを探す。文字検索との使い分け、ローカル埋め込み、Ollama の設定を解説。'),
  takeaway: l('Keep exact search for precise strings. Add Meaning Search when you remember the idea but not the wording; a local embedding model supplies the extra retrieval path.', '正確な文字列には文字検索を。表現を忘れて意味だけ覚えているときは、ローカル埋め込みモデルを使う意味検索がもうひとつの経路になります。'),
  image: { src: '/images/blog/meaning-search.webp', width: 1600, height: 900,
    alt: l('A query and a clipboard card connected through a local processor, alongside an exact-match path.', 'ローカル処理を通じてつながる検索語とクリップ。別に文字一致の経路もあります。'),
    caption: l('Conceptual illustration: related wording and exact text are complementary retrieval paths.', '概念図：意味の近さと文字の一致は、互いを補う検索経路です。') },
  sections: [
    { id: 'exact-or-meaning', title: l('The frustration of the tip-of-the-tongue search', '「思い出せない」を解決する意味検索'), paragraphs: [
      l('Every developer and knowledge worker knows the feeling. You copied a multi-line Docker command three weeks ago to clean up hung containers and dangling volumes. Today, you urgently need it, but you search for “clean up docker space”. The original clip contained docker system prune with specific flags. Not a single keyword matches. Standard exact-string search returns nothing, and you end up scouring the web all over again.', 'エンジニアなら誰もが経験するもどかしさがあります。数週間前にコンテナの掃除コマンドをコピーしたはずなのに、検索窓に「docker 容量 削除」と打っても一件もヒットしない。元の文章にはシステムコマンドが書かれており、検索ワードと一文字も一致しないからです。完全一致検索だけでは、記憶の断片を拾い上げることができません。'),
      l('Exact keyword search is unbeatable for unique strings—error codes, UUIDs, function names like handleWebhookCallback, or configuration keys. But human recall is conceptual: we remember what something did, not the exact phrasing we copied. ClipsX combines keyword and semantic retrieval in a unified engine, allowing you to find clips by verbatim syntax or by remembered intent without juggling separate tools.', 'エラーコード、UUID、関数名などの一意な文字列を探すなら、完全一致検索が最も高速で正確です。しかし人間の記憶は概念的であり、正確な構文ではなく「何をするものだったか」を覚えていることが大半です。ClipsX は完全一致と意味検索をハイブリッドで組み合わせ、言葉の正確さと曖昧な記憶の双方から必要なクリップを復元します。'),
    ] },
    { id: 'what-the-model-does', title: l('Dense embeddings: search by concept, not keywords', 'ベクトル埋め込み：言葉ではなく概念で探す'), paragraphs: [
      l('An embedding model converts human language into high-dimensional vectors—numerical representations that capture semantic meaning. ClipsX indexes eligible clipboard text, manual notes, tags, and completed OCR extractions using local vectors. When you type a query, the model compares vector proximity. This allows “quiet spot to work” to match “café with fast Wi-Fi and power outlets”, even when zero words overlap.', '埋め込みモデルはテキストを多次元の数値ベクトルに変換し、意味的な近さを比較可能にします。ClipsX は対象クリップの本文、メモ、タグ、OCR抽出テキストをローカルでベクトル化します。検索時にベクトルの類似度を計算するため、文言が完全に異なっていても「静かに作業できる場所」と「電源とWi-Fiのあるカフェ」を結びつけることができます。'),
      l('Meaning Search is designed for retrieval, not speculative text generation. It returns your authentic saved clips and highlights matching excerpts. It is distinct from generative features like Recall, which synthesize new paragraphs from retrieved context. You can use semantic search without configuring text generation, ensuring that you always inspect the original, unaltered snippet before executing commands or sharing code.', '意味検索の役割は「原本を探し出すこと」であり、文章を自動生成することではありません。検索結果として表示されるのは保存されたクリップそのものです。検索結果を元に要約を作成する Recall とは異なり、意味検索だけであれば文章生成モデルは不要です。常に加工されていない原本を確認できるため、コマンドの実行やコードの再利用も安全に行えます。'),
    ] },
    { id: 'setup', title: l('Running local embeddings with Ollama', 'Ollama によるローカル埋め込みの接続'), paragraphs: [
      l('Ollama provides a lightweight local runtime for machine learning models. Unlike resource-heavy generative models that require gigabytes of VRAM, embedding models (such as nomic-embed-text or bge-m3) are compact, fast, and run effortlessly on consumer laptops. ClipsX connects to Ollama over a standard local loopback interface, ensuring that zero clipboard text leaves your machine.', 'Ollama は端末内でモデルを実行するための手軽な環境です。膨大なメモリを消費する会話モデルと異なり、埋め込み専用モデルは数百メガバイト程度と非常に軽量で、一般的なノートPCでも軽快に動作します。ClipsX はループバック通信経由で Ollama と連携するため、クリップボードの内容がインターネットへ送られる心配はありません。'),
    ], list: { ordered: true, items: [
      l('Install and start Ollama, then pull a specialized embedding model such as ollama pull nomic-embed-text.', 'Ollama を導入して起動し、テキスト埋め込みモデル（例：nomic-embed-text）をダウンロードする。'),
      l('In ClipsX, navigate to Intelligence → Models, enter your local endpoint (http://localhost:11434), and select Connect.', 'ClipsX の Intelligence → Models を開き、通常のエンドポイント（http://localhost:11434）を入力して接続する。'),
      l('Choose your installed embedding model and toggle on Meaning Search.', '導入済みの埋め込み対応モデルを選択し、Meaning Search（意味検索）を有効にする。'),
      l('Allow the local background indexer to process eligible clips, then test a conceptual query to inspect matching passages.', 'バックグラウンドでの索引作成が完了したら、覚えている概念で検索し、一致したクリップを確認する。'),
    ] }, links: [{ label: l('Meaning Search setup guide', '意味検索の設定ガイド'), href: documentationConfig.meaningSearch }] },
    { id: 'cost-and-location', title: l('Local intelligence with zero cloud telemetry', '完全ローカルで動く知性と負荷の管理'), paragraphs: [
      l('Embedding models take up negligible disk space (typically 200MB to 600MB), and inference takes only milliseconds per query. However, initial indexing of a massive historical backlog consumes CPU cycles and temporary compute. Start with a lightweight model optimized for your primary languages. Massive models rarely improve retrieval accuracy for short snippets and only increase indexing duration.', '埋め込みモデルが消費する容量は通常200MB〜600MB程度で、検索時の計算もわずか数ミリ秒で完了します。ただし、数千件の既存履歴を一括して初回インデックス化する際は一定の計算負荷がかかります。まずは使用言語に適した小型モデルから導入することをお勧めします。モデルサイズをむやみに大きくしても、短い断片の検索精度が劇的に上がるわけではありません。'),
      l('Using the loopback http://localhost:11434 connection guarantees on-device inference. Fetching the initial model weights requires an internet connection, and Ollama also supports remote hosting configurations. Never assume that the label AI automatically implies offline safety. Verify your model endpoint and network activity to confirm that your clipboard vectors remain strictly on local storage.', 'ローカルのループバックアドレスを使用することで、端末内推論が保たれます。モデルの取得時には外部通信が発生するほか、Ollama にはリモート接続の構成も存在します。「AI」という言葉だけで無条件に安全だと過信せず、接続先と通信設定を確認して、クリップのベクトルが手元で処理されていることを確かめましょう。'),
    ] },
    { id: 'troubleshooting', title: l('Diagnosing missing results and tuning thresholds', '見つからないときの確認と類似度調整'), paragraphs: [
      l('If Ollama stops running, ClipsX gracefully falls back to instant keyword search. Check that the Ollama service is active and that your chosen embedding model is still available. If recent clips are missing from semantic queries, check the background indexing queue. OCR-derived text becomes searchable only after local image character extraction completes.', 'Ollama が停止した場合でも、ClipsX は即座に通常の文字一致検索へ切り替わります。結果が出ない場合は、サービスの起動状態とモデルの選択を確認してください。最近コピーした内容が見つからない場合は、インデックス処理の進行状況を確認します。画像内の文字は OCR 処理が完了した段階で検索対象に含まれます。'),
      l('Vector similarity represents distance in mathematical embedding space, not guaranteed factual correctness. An optional minimum similarity threshold filters out weak semantic candidates without affecting exact keyword matches. Setting this threshold too high can obscure useful related clips; adjust it thoughtfully using real-world query examples from your daily notes.', 'ベクトルの類似度は多次元空間上での距離を表す指標であり、回答の正しさを保証する確率ではありません。設定可能な最低類似度のしきい値は意味検索の候補だけを絞り込み、完全一致の結果には影響しません。しきい値を高く設定しすぎると関連する有用なクリップまで隠れてしまうため、実際の検索例を見ながら調整してください。'),
    ] },
    { id: 'index-controls', title: l('Your clips are permanent; indexes are disposable', '原本は不変、インデックスは再構築可能'), paragraphs: [
      l('Changing your embedding model in ClipsX automatically creates a replacement index alongside the active one, ensuring uninterrupted search. An explicit Reindex All command clears and rebuilds text vectors from scratch. In all cases, your original clipboard history remains completely untouched. You can disable Meaning Search at any moment to return to pure, instant keyword search without any model dependency.', '埋め込みモデルを変更すると、現在の索引を維持したまま裏側で新しいインデックスを準備するため、検索が中断することはありません。全再構築（Reindex All）を実行するとベクトルを一から作り直しますが、原本であるクリップのデータが失われることは決してありません。必要に応じていつでも意味検索をオフにし、従来の高速な文字検索に戻せます。'),
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
  slug: 'connect-your-assistant-to-clipboard-with-mcp', date: '2026-10-25',
  topic: l('Assistant workflows', 'アシスタントの活用'),
  title: l('Let your assistant find what you already copied', 'コピー済みの情報を、アシスタントから探す'),
  description: l('Connect Claude Code, Codex, or any MCP client to your clipboard. Turn copied snippets into grounded engineering handoffs, coding context, and research briefs.', 'Claude Code や Codex などの MCP 対応アシスタントとクリップボードを連携。コピー済みの断片を開発引き継ぎ、参考コード、調査メモへ活用します。'),
  takeaway: l('Connect a compatible assistant with read-only access, ask for relevant saved clips, and inspect the sources. Start with one task you would otherwise solve by hunting through tabs and pasting context again.', '対応アシスタントを読み取り専用で接続し、関連クリップを探して原文を確認します。まずはタブを探し直して資料を貼り直す作業を、一つ置き換えてみましょう。'),
  image: { src: '/images/blog/clipboard-mcp.webp', width: 1600, height: 900,
    alt: l('Saved clipboard notes connect through authorized local MCP access to an assistant, which returns a draft with source references.', '保存済みのメモが許可されたローカルMCP接続を通ってアシスタントに渡り、引用元付きの下書きになる流れ。'),
    caption: l('Conceptual workflow: saved clips → authorized retrieval → a draft you can check. These are illustrative scenarios, not customer testimonials.', '概念図：保存済みクリップ → 許可した検索 → 確認できる下書き。利用例は説明用であり、顧客の体験談ではありません。') },
  sections: [
    { id: 'the-context-you-already-collected', title: l('The context you need is already in your clipboard', '必要な資料は、すでに履歴の中に'), paragraphs: [
      l('You are investigating a production bug. Over twenty minutes, you copy a stack trace from monitoring, a schema snippet from GitHub, and an incident report from Slack. When you switch to your AI coding assistant, you face a tedious chore: hunting across twenty browser tabs to copy and re-paste each piece of context into the chat prompt. ClipsX eliminates this friction by exposing eligible clipboard history through the Model Context Protocol (MCP), allowing compatible assistants to search and retrieve your saved snippets directly.', '障害の調査中、エラーログ、GitHubのスキーマ定義、チャットの報告を次々とコピーしたとします。その後AIアシスタントに状況を伝える際、開いた多数のタブを行き来して同じ文章を何度も貼り直すのは非効率です。ClipsX は MCP（Model Context Protocol）を通じて保存済みクリップを公開し、対応アシスタントが必要な資料を直接検索して参照できるようにします。'),
      l('MCP acts as an authorized local transport bridge between your assistant and ClipsX, not a second chat model embedded in your clipboard. The workflow examples detailed below are realistic developer scenarios, not observed customer results. Their purpose is to shorten the manual path from fragmented notes to reviewable drafts, without promising measured time savings or automated correctness.', 'MCP はアシスタントと ClipsX をつなぐ安全な通信プロトコルであり、クリップボード内に新たなチャットモデルを追加するものではありません。以下のシナリオは実際の開発現場を想定した活用例であり、特定の顧客における実測結果ではありません。散らばった断片から確認可能な下書きへ至る手順を示すもので、時間短縮や回答の正確性を保証するものではありません。'),
    ], links: [{ label: l('Connect Codex, Claude Code, or another MCP client', 'Codex、Claude CodeなどのMCP接続手順'), href: documentationConfig.mcp + '#setup' }] },
    { id: 'support-handoff', title: l('Support: hand off evidence, not vague symptoms', 'サポート：推測ではなく確固たる根拠を引き継ぐ'), paragraphs: [
      l('Imagine a support engineer copies an alert describing concurrent checkout failures alongside an internal API note regarding database connection pooling timeouts. Instead of manually retyping the incident timeline, prompt the assistant: “Find my copied Orion incident report and API timeout notes. Draft an engineering handoff outlining observed symptoms, supporting excerpts, and open questions.” Providing a project keyword or approximate date helps the tool quickly isolate the right clips.', 'サポート担当者が、決済処理のエラー報告とタイムアウトに関するAPI仕様メモをコピーしているとします。「コピーした Orion の障害報告と API メモを検索し、発生症状、根拠となる抜粋、未解決の疑問点を整理した開発引き継ぎを作って」と指示します。案件名や時期を指定することで、アシスタントは的確に対象クリップを絞り込みます。'),
      l('The goal is an actionable handoff another engineer can independently verify without repeating the initial discovery phase. Verify that the assistant accurately quotes the retrieved text, clearly separates customer observations from inferred causes, and leaves root causes open when evidence is inconclusive. A matching timeout parameter is a valuable clue, not definitive proof of an underlying code defect.', '目的は、別のエンジニアが最初から調べ直すことなく検証できる引き継ぎ資料を作ることです。アシスタントが原文を正確に引用しているか、顧客の報告と推測を混同していないか、根拠のない原因を断定していないかを確認してください。同一のタイムアウト値は手掛かりに過ぎず、バグの決定的な証明ではありません。'),
    ] },
    { id: 'coding-context', title: l('Development: retrieve API contracts without leaving the editor', '開発：エディタを離れずにAPI仕様を取り戻す'), paragraphs: [
      l('While writing an integration, you previously copied an error message and a relevant section of third-party documentation. Rather than searching the web again, prompt your coding assistant: “Find the retry guidance and connection error I copied for Orion. Summarize what the saved notes require and identify what still needs verification before modifying the code.” The assistant brings those exact snippets into your active workspace.', 'API連携の実装中に、エラーメッセージと公式ドキュメントの再試行ルールをコピーしていたとします。「Orion 向けに保存した再試行方針と接続エラーのメモを探し、コード修正前に確認すべき条件を箇条書きでまとめて」と頼めば、ブラウザに戻ることなく手元のエディタへ必要な文脈を呼び戻せます。'),
      l('Use exact keywords or error numbers for distinctive technical logs. For broader concepts, Meaning Search retrieves relevant clips when local embedding models are active. Always instruct your assistant to cite and inspect source candidates before recommending code refactors. Copied documentation excerpts may reflect older library versions, so confirm current upstream specifications before applying architectural changes.', '特定のエラーには固有のエラーコードを指定します。記憶が曖昧な場合は、ローカル埋め込みによる意味検索が役立ちます。修正コードを提案させる前に、アシスタントが引用した原文を確認させましょう。保存した資料が古い可能性もあるため、ライブラリのバージョンに関わる変更は最新の公式資料と照合してください。'),
    ] },
    { id: 'research-comparison', title: l('Research: ground comparisons in passages you selected', '調査：自分が選定した文章を正確に比較する'), paragraphs: [
      l('During product or architecture evaluations, engineers frequently copy benchmark snippets, licensing constraints, and technical claims across different tools. Ask: “Compare my saved notes on Orion and Vega regarding offline storage support. Separate verified vendor statements, ambiguous claims, and follow-up questions.” The assistant compiles a structured brief grounded entirely in your selected clips.', 'ツールの比較評価時に、ベンチマーク結果やライセンス条項、公式発表の文章をコピーしていく場面があります。「保存した Orion と Vega のメモからオフライン対応を比較し、明確な仕様、情報不足な点、追加質問に分類して」と依頼すれば、自分が選んだ文章に基づいた客観的な比較メモを素早く整理できます。'),
      l('This workflow transforms interrupted reading sessions into structured, reviewable decision briefs. It does not imply that the assistant has independently audited vendor claims or searched the broader internet. If a saved snippet lacks an original source URL or timestamp, require the assistant to acknowledge that gap rather than fabricating a citation. Copied text represents evidence of what you captured, not an endorsement of universal truth.', '散在するメモを確認可能な比較資料へと昇華させる手法です。アシスタントがウェブ全体を独自に検証したわけではない点に留意してください。URLや日付が残っていない場合は推測で補わせず、情報の欠落として扱わせます。保存された文章は「自分が過去に記録した事実」であり、普遍的な真実の証明ではありません。'),
    ] },
    { id: 'start-read-only', title: l('Start safely with read-only permissions', '安全な読み取り専用アクセスから始める'), paragraphs: [
      l('In ClipsX, open Intelligence → Integrations, enable the local MCP server, and generate a named access token for your client. Follow the generated configuration steps for Claude Code or Codex, restart the assistant client, and run the test connection. Verify the setup by copying a harmless note containing a distinctive project name and asking your assistant to retrieve and quote it. Adding access inside ClipsX prepares the endpoint, but client-side configuration is still required.', 'ClipsX の「インテリジェンス → 連携」でローカルサーバーを有効にし、クライアント用のアクセストークンを生成します。表示される接続設定に従ってクライアントを設定・再起動し、接続をテストします。固有のキーワードを含めた安全なメモをコピーし、アシスタントがそれを検索して引用できるか確認してください。ClipsX 側の設定だけでなくクライアント側の設定も完了させる必要があります。'),
      l('ClipsX must remain running on your computer to respond to retrieval requests. Exact keyword search operates with zero AI dependencies; semantic retrieval activates when local embeddings are configured. Remember that the external assistant uses its own cloud or local model to process answers. Always test real search queries in the assistant client, and store authentication credentials according to the documentation rather than committing secrets to shared repositories.', '検索に応答するためには ClipsX が起動している必要があります。キーワード検索なら追加のAIモデルは不要で、意味検索を行うには埋め込みモデルが必要です。外部アシスタントは独自のモデルで回答を作成します。接続テストだけでなく実際の検索動作も確認し、認証トークンを共有リポジトリに誤ってコミットしないよう注意してください。'),
    ], links: [{ label: l('Follow the MCP setup and first-task guide', 'MCPの接続と最初の検索を試す'), href: documentationConfig.mcp }] },
    { id: 'choose-the-boundary', title: l('Establish strict boundaries for assistant access', 'アシスタントへのアクセス権限を厳密に管理する'), paragraphs: [
      l('Read-only access is entirely sufficient for search, citation, and draft synthesis workflows. Read-write access additionally supports clip creation and tag management, but it never grants arbitrary filesystem access, shell execution, or bulk history deletion. Configure separate tokens for each assistant client and revoke unused integrations immediately. Keep in mind that external assistants may transmit retrieved clip contents to their respective hosted AI providers.', '検索、引用、下書き作成の用途であれば、読み取り専用アクセスで完全に足ります。読み書き権限はクリップの新規作成やタグ付けを可能にしますが、任意ファイル操作やシェル実行、履歴の一括削除は許可しません。連携先ごとに個別のトークンを発行し、不要になったものは速やかに失効させましょう。外部アシスタントが取得した内容を提供元のサーバーへ送信する場合があることにも留意してください。'),
      l('Secret and private clips are systematically excluded from assistant retrieval endpoints. However, automated privacy classification can miss sensitive patterns, and a failed privacy check does not automatically restrict a clip. Always review your classification settings before copying confidential customer information. For automated organization, decision models evaluate new copies at capture time, whereas MCP serves the distinct role of answering later queries from external assistants.', '秘密情報や非公開のクリップはアシスタントの検索対象から自動的に除外されます。ただし自動分類が機密情報を見逃す可能性があり、判定失敗だけでは制限されない場合があります。機密性の高いデータを扱う際は事前に設定を確認してください。保存時の自動タグ付けを行う判定モデルと、後からの問い合わせに応答する MCP の役割の違いを理解して運用しましょう。'),
    ], links: [{ label: l('Understand decision rules and failed privacy checks', '判定ルールとプライバシー判定の失敗を理解する'), href: documentationConfig.decisionModels + '#failed-checks' }] },
  ],
  resources: [
    { label: l('MCP setup, permissions, and troubleshooting', 'MCPの接続、権限、トラブル対応'), href: documentationConfig.mcp },
    { label: l('Set up Meaning Search', '意味検索を設定する'), href: documentationConfig.meaningSearch },
    { label: l('Conditional extension automation', '拡張機能の条件付き自動実行'), href: documentationConfig.automation },
    { label: l('ClipsX MCP implementation and protocol reference', 'ClipsXのMCP実装とプロトコル仕様（英語）'), href: 'https://github.com/azure06/clipsx/blob/main/docs/MCP.md' },
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
