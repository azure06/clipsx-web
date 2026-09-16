import type { Locale } from "@/i18n/config";

type Copy = Record<Locale, string>;
const t = (en: string, ja: string): Copy => ({ en, ja });

export interface PricingFeatureGroup {
  id: string;
  title: Copy;
  description: Copy;
  features: Array<{
    name: Copy;
    description: Copy;
    requirement: Copy;
    href?: string;
  }>;
}

// This is the public feature inventory, not a billing or entitlement policy.
// Every listed feature belongs to the current Free plan. Paid benefits are undefined.
export const pricingFeatureGroups: PricingFeatureGroup[] = [
  {
    id: "capture",
    title: t("Capture & preview", "保存とプレビュー"),
    description: t(
      "Keep the content, then inspect the details.",
      "内容を保存し、必要な情報を確認。",
    ),
    features: [
      {
        name: t("Clipboard history", "クリップボード履歴"),
        description: t(
          "Save supported text, images, links, and file references on your device.",
          "対応するテキスト、画像、リンク、ファイル参照を端末に保存。",
        ),
        requirement: t(
          "Local storage; capture support varies by platform.",
          "端末のストレージを使用。保存対応は OS によって異なります。",
        ),
        href: "/product",
      },
      {
        name: t("Rich representations", "リッチなデータ表現"),
        description: t(
          "Preserve supported alternatives such as HTML, Markdown, tables, and native formats.",
          "HTML、Markdown、表、ネイティブ形式など、対応する表現を保持。",
        ),
        requirement: t(
          "Depends on the source app and formats it provides.",
          "コピー元のアプリと提供される形式によって異なります。",
        ),
      },
      {
        name: t("Content previews", "コンテンツのプレビュー"),
        description: t(
          "Inspect available representations and source information before reuse.",
          "再利用前に、利用可能な表現とコピー元の情報を確認。",
        ),
        requirement: t(
          "Available previews depend on the captured content.",
          "保存された内容によって利用できるプレビューが異なります。",
        ),
      },
      {
        name: t("OCR text extraction", "OCR による文字抽出"),
        description: t(
          "Make text from captured images available for inspection and search.",
          "保存した画像内の文字を、確認や検索に利用。",
        ),
        requirement: t(
          "Requires an available OS provider or Tesseract and installed languages.",
          "OS の OCR または Tesseract と対応言語が必要です。",
        ),
      },
    ],
  },
  {
    id: "search",
    title: t("Search & recall", "検索と Recall"),
    description: t(
      "From an exact phrase to a question across your history.",
      "正確な言葉での検索から、履歴への質問まで。",
    ),
    features: [
      {
        name: t("Full-text search", "全文検索"),
        description: t(
          "Find words, prefixes, commands, paths, and other text you remember.",
          "覚えている単語、接頭辞、コマンド、パスなどを検索。",
        ),
        requirement: t(
          "Works without an AI model or Ollama.",
          "AI モデルや Ollama は不要です。",
        ),
      },
      {
        name: t("Filters & scopes", "絞り込みと検索範囲"),
        description: t(
          "Narrow history by pins, favorites, tags, content types, and available filters.",
          "ピン、お気に入り、タグ、種類などで履歴を絞り込み。",
        ),
        requirement: t(
          "Uses your local history and metadata.",
          "端末内の履歴と関連情報を使用します。",
        ),
      },
      {
        name: t("Meaning Search", "意味検索"),
        description: t(
          "Find related text even when you remember different wording.",
          "表現を正確に覚えていなくても、関連するテキストを検索。",
        ),
        requirement: t(
          "Optional Ollama embedding model and a local index.",
          "任意の Ollama 埋め込みモデルとローカルインデックスが必要です。",
        ),
        href: "/docs/meaning-search",
      },
      {
        name: t("Recall", "Recall"),
        description: t(
          "Ask selected history a question and inspect the clips cited in the answer.",
          "選択した履歴に質問し、回答が参照したクリップを確認。",
        ),
        requirement: t(
          "Optional Ollama generation model. Answers need verification.",
          "任意の Ollama 文章生成モデルが必要です。回答は確認してください。",
        ),
        href: "/recall",
      },
    ],
  },
  {
    id: "workflow",
    title: t("Organize & reuse", "整理と再利用"),
    description: t(
      "Put saved content back to work.",
      "保存した内容を、次の作業へ。",
    ),
    features: [
      {
        name: t(
          "Pins, favorites, notes & tags",
          "ピン、お気に入り、メモ、タグ",
        ),
        description: t(
          "Keep frequent clips close and add context to what you saved.",
          "よく使うクリップを整理し、保存した内容に情報を追加。",
        ),
        requirement: t(
          "Stored on your device with your clips.",
          "クリップと一緒に端末内に保存されます。",
        ),
      },
      {
        name: t("Copy & paste", "コピーと貼り付け"),
        description: t(
          "Choose the supported representation you want to reuse.",
          "再利用したい対応形式を選択。",
        ),
        requirement: t(
          "Paste behavior depends on the destination app and OS.",
          "貼り付け動作は対象アプリと OS によって異なります。",
        ),
      },
      {
        name: t("Export & system sharing", "書き出しと OS の共有機能"),
        description: t(
          "Export supported content or share it through the operating system.",
          "対応する内容を書き出し、または OS の機能で共有。",
        ),
        requirement: t(
          "Platform-dependent. Sharing is an explicit action.",
          "OS によって異なります。共有は自分で実行した場合のみです。",
        ),
      },
      {
        name: t("Extensions", "拡張機能"),
        description: t(
          "Add supported views, actions, and transformations to your workflow.",
          "対応する表示、操作、変換機能を追加。",
        ),
        requirement: t(
          "Compatible packages and permission approval; requirements vary.",
          "互換パッケージと権限の承認が必要です。要件は拡張ごとに異なります。",
        ),
        href: "/extensions",
      },
    ],
  },
  {
    id: "settings",
    title: t("Settings & data", "設定とデータ"),
    description: t(
      "Know what stays local and what needs an account.",
      "端末内に残るものと、アカウントが必要なもの。",
    ),
    features: [
      {
        name: t("Local desktop use", "デスクトップでのローカル利用"),
        description: t(
          "Capture, search, and organize history without signing in.",
          "サインインせずに履歴の保存、検索、整理を利用。",
        ),
        requirement: t(
          "No account required for core desktop features.",
          "デスクトップの基本機能にアカウントは不要です。",
        ),
      },
      {
        name: t("Preferences & shortcuts", "環境設定とショートカット"),
        description: t(
          "Adjust supported app preferences and command shortcuts.",
          "対応するアプリ設定とコマンドのショートカットを調整。",
        ),
        requirement: t(
          "Some options depend on your operating system.",
          "一部の項目は OS によって異なります。",
        ),
      },
      {
        name: t(
          "Settings & extension-choice sync",
          "設定と拡張機能の選択情報の同期",
        ),
        description: t(
          "Optionally sync supported preferences and extension choices.",
          "対応する設定と拡張機能の選択情報を任意で同期。",
        ),
        requirement: t(
          "Account and opt-in required. Clipboard content and local models do not sync.",
          "アカウントと有効化が必要です。クリップ内容やローカルモデルは同期しません。",
        ),
        href: "/docs/sync",
      },
    ],
  },
];
