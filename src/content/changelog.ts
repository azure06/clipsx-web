import { l } from './marketing';

// Source: https://github.com/azure06/clipsx/releases/tag/v0.1.0
const firstRelease = {
  version: '0.1.0',
  publishedAt: '2026-10-03T02:39:45Z',
  url: 'https://github.com/azure06/clipsx/releases/tag/v0.1.0',
  title: l('The first public release.', '初めての公開リリース。'),
  description: l(
    'Your clipboard history, local search, and programmable workflows—available on Windows, macOS, and Linux/X11.',
    'クリップボード履歴、ローカル検索、拡張可能なワークフローを Windows、macOS、Linux/X11 で利用できます。',
  ),
  highlights: [
    l('Local clipboard history, text search, and local OCR.', 'ローカルのクリップボード履歴、テキスト検索、ローカル OCR。'),
    l('Optional semantic search and Recall with your local models.', 'ローカルモデルを使う任意の意味検索と Recall。'),
    l('Programmable Extension API v3.2 operations.', 'Extension API v3.2 による拡張可能な操作。'),
    l('Optional configuration sync. Clipboard contents stay on your device.', '任意の設定同期。クリップボード内容は端末に残ります。'),
    l('English and Japanese desktop interfaces.', '英語と日本語のデスクトップインターフェース。'),
    l('Signed Windows installer, signed and notarized macOS packages, and Linux AppImage and Debian packages. In-app updates verify updater signatures.', '署名済み Windows インストーラー、公証・署名済み macOS パッケージ、Linux AppImage・Debian パッケージ。アプリ内更新は更新用署名を検証します。'),
  ],
  limits: [
    l('Linux support covers X11. Wayland is outside this release’s platform support.', 'Linux の対応範囲は X11 です。Wayland は本リリースの対応範囲外です。'),
    l('Older incompatible database schemas require an explicit reset. Back up needed clipboard content before resetting.', '互換性のない旧データベースには明示的なリセットが必要です。必要な内容はリセット前にバックアップしてください。'),
    l('Automatic downgrade and rollback are not provided. Recover an interrupted update by installing the signed package for the same or a newer version.', '自動ダウングレードやロールバックには対応しません。更新が中断した場合は同じバージョンか新しいバージョンの署名済みパッケージで復旧できます。'),
  ],
} as const;

const compatibleUpgrade = [l(
  'Compatible existing databases are retained. The updater public key and stable update endpoint are unchanged.',
  '互換性のある既存データベースは保持されます。更新用公開鍵と安定版の更新先は変更されていません。',
)];

// Published stable releases only. Dates are GitHub publication timestamps (UTC).
export const releases = [
  {
    version: '0.1.6',
    publishedAt: '2026-10-16T12:30:29Z',
    url: 'https://github.com/azure06/clipsx/releases/tag/v0.1.6',
    title: l('App information and easier assistant setup.', 'アプリ情報とアシスタント設定を改善。'),
    description: l('Find your build details, connect assistants more easily, and get more reliable Recall context.', 'ビルド情報の確認、アシスタントの接続、Recallのコンテキスト処理を改善しました。'),
    highlights: [
      l('Add Settings → About with version and build details, Copy app info, and update controls.', '設定にバージョン情報を追加。ビルド情報の確認・コピーとアプリ更新をまとめました。'),
      l('Simplify assistant setup and allow deleting active or revoked assistant access.', 'アシスタント設定を簡潔にし、有効なアクセスと失効済みアクセスの削除に対応。'),
      l('Improve MCP retrieval guidance for vaguely remembered content and source checking.', '曖昧に覚えている内容の検索と引用元の確認に向けて、MCPの案内を改善。'),
      l('Include initial clipboard evidence in Recall and fit retrieved sources to the model’s available context.', 'Recallに最初のクリップの根拠を含め、モデルの残りコンテキストに合わせて検索結果を調整。'),
      l('Add platform shortcut defaults, a disabled shortcut option, and conflict feedback.', 'OS別のショートカット初期値、無効化、競合の表示に対応。'),
      l('Restore macOS Dock activation, improve indexing status, and reduce false secret detection.', 'macOSのDockからの表示を復旧し、索引の状態表示と秘密情報の誤検出を改善。'),
      l('Update Wasmtime and rustls for security fixes.', 'Wasmtimeとrustlsにセキュリティ修正を適用。'),
    ],
    limits: compatibleUpgrade,
  },
  {
    version: '0.1.5',
    publishedAt: '2026-10-14T09:33:00Z',
    url: 'https://github.com/azure06/clipsx/releases/tag/v0.1.5',
    title: l('Saved Recall chats and assistant integrations.', 'Recallの会話保存とアシスタント連携。'),
    description: l('Use saved local conversations, choose models by feature, and connect compatible assistants to ClipsX.', '会話を端末に保存し、機能ごとにモデルを選び、対応アシスタントをClipsXに接続できます。'),
    highlights: [
      l('Add saved Recall conversations with clipboard sources, image context, and undoable actions.', 'クリップの引用元、画像コンテキスト、取り消し可能な操作を備えたRecallの会話保存を追加。'),
      l('Configure multiple Ollama, OpenAI, Anthropic, Gemini, and OpenRouter connections with independent feature selections.', 'Ollama、OpenAI、Anthropic、Gemini、OpenRouterの複数接続と機能ごとのモデル選択に対応。'),
      l('Add authenticated local MCP access for compatible external assistants.', '対応する外部アシスタント向けに、認証付きローカルMCPアクセスを追加。'),
      l('Improve context limits, conversation compaction, and provider diagnostics.', 'コンテキスト制限、会話の要約、プロバイダーの診断を改善。'),
      l('Keep the active semantic index available while a replacement builds.', '新しい意味検索の索引を作成中も、既存の有効な索引を保持。'),
    ],
    limits: [
      ...compatibleUpgrade,
      l('Chats stay on your device. Hosted indexing requires explicit enablement; MCP is off by default and requires assistant access grants.', '会話は端末に保存されます。外部サービスでの索引作成は明示的な有効化が必要です。MCPは初期状態で無効で、アシスタントごとのアクセス許可が必要です。'),
    ],
  },
  {
    version: '0.1.4',
    publishedAt: '2026-10-09T05:27:26Z',
    url: 'https://github.com/azure06/clipsx/releases/tag/v0.1.4',
    title: l('Shortcut reliability and setup help.', 'ショートカットの安定性と設定ヘルプを改善。'),
    description: l('Keep the global shortcut working with extension windows open and find help where you need it.', '拡張機能のウィンドウを開いていてもグローバルショートカットを使え、画面から関連ヘルプを開けます。'),
    highlights: [
      l('Preserve the global shortcut while extension windows are open.', '拡張機能のウィンドウを開いている間もグローバルショートカットを維持。'),
      l('Add English and Japanese contextual help for Search, Recall, and Intelligence setup.', '検索、Recall、インテリジェンス設定に英語・日本語の関連ヘルプを追加。'),
    ],
    limits: compatibleUpgrade,
  },
  {
    version: '0.1.3',
    publishedAt: '2026-10-07T23:55:55Z',
    url: 'https://github.com/azure06/clipsx/releases/tag/v0.1.3',
    title: l('Linux window controls restored.', 'Linux のウィンドウ操作を復旧。'),
    description: l('A focused update restoring window controls on Linux and the matte application background.', 'Linux のウィンドウ操作と、マットなアプリ背景を復旧する更新です。'),
    highlights: [
      l('Restore Linux window controls.', 'Linux のウィンドウ操作を復旧。'),
      l('Restore the matte application background.', 'マットなアプリ背景を復旧。'),
    ],
    limits: compatibleUpgrade,
  },
  {
    version: '0.1.2',
    publishedAt: '2026-10-04T14:54:51Z',
    url: 'https://github.com/azure06/clipsx/releases/tag/v0.1.2',
    title: l('Clearer diagnostics and Japanese settings.', '診断画面と日本語の設定表示を改善。'),
    description: l('Review reports inline, understand submission consent, and find restored Japanese settings translations.', '画面内でのレポート確認と送信同意をわかりやすくし、設定画面で欠けていた日本語訳を復旧しました。'),
    highlights: [
      l('Simplify Diagnostics & support with inline report review, clearer consent controls, and additional tools grouped together.', '診断とサポートを整理し、画面内でのレポート確認、わかりやすい同意操作、追加ツールのグループ化に対応。'),
      l('Restore missing Japanese settings translations.', '設定画面で欠けていた日本語訳を復旧。'),
      l('Update compatible application dependencies.', '互換性のあるアプリ依存関係を更新。'),
    ],
    limits: compatibleUpgrade,
  },
  {
    version: '0.1.1',
    publishedAt: '2026-10-03T14:44:28Z',
    url: 'https://github.com/azure06/clipsx/releases/tag/v0.1.1',
    title: l('Runtime fixes and startup recovery.', '実行環境の修正と起動時の復旧。'),
    description: l('Security fixes for the extension runtime, improved macOS runtime permissions, and non-destructive startup recovery.', '拡張機能の実行環境にセキュリティ修正を適用し、macOS の実行権限とデータを削除しない起動時の復旧を改善しました。'),
    highlights: [
      l('Update Wasmtime to 48.0.5 for the October 2 security fixes.', '10 月 2 日のセキュリティ修正に対応するため Wasmtime を 48.0.5 に更新。'),
      l('Fix hardened macOS extension runtime permissions and verify the signed runtime during packaging.', 'macOS の拡張機能実行権限を修正し、パッケージ作成時に署名済み実行環境を検証。'),
      l('Show non-destructive startup recovery with diagnostics access.', 'データを削除しない起動時の復旧と、診断へのアクセスを追加。'),
      l('Add local macOS crash-report review and submissions requiring explicit consent.', 'macOS のクラッシュレポートをローカルで確認し、明示的な同意を得て送信する機能を追加。'),
      l('Retain matching macOS debug symbols for crash analysis and preserve the existing icon artwork.', 'クラッシュ解析用の対応する macOS デバッグシンボルを保持し、既存のアイコンを維持。'),
    ],
    limits: [l('Preserve compatible development and production databases, including known migration line-ending differences.', '既知のマイグレーション改行差異を含め、互換性のある開発用・本番用データベースを保持。')],
  },
  firstRelease,
] as const;
