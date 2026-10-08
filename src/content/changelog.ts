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
