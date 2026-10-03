import { l } from './marketing';

// Source: https://github.com/azure06/clipsx/releases/tag/v0.1.0
export const firstRelease = {
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
