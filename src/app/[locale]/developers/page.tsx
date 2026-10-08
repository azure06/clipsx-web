import type { Metadata } from 'next';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { PageIntro } from '@/components/marketing/Marketing';
import { documentationConfig, siteConfig } from '@/config/site';
import type { Locale } from '@/i18n/config';
import { pageMetadata } from '@/lib/seo';

const copy = {
  en: {
    eyebrow: 'Developers', title: 'Build extensions for what people copy.',
    description: 'Turn copied text into a useful view, a transformation, or an action. ClipsX provides the clipboard workspace; your extension adds the workflow.',
    start: 'Build your first extension', examples: 'Browse extension examples',
    demoTitle: 'One clip. A useful result.', demoBody: 'Rewrite is a first-party example: selected text goes to the configured generation model, and the result stays beside the original clip.',
    demoNote: 'Illustrative workflow and generated output. A local generation model is required for Rewrite; results need review.',
    input: 'Copied text', inputText: 'hey can you send the updated diagram before friday? need it for the review',
    operation: 'Rewrite · Business', output: 'Attached result', outputText: 'Could you send the updated diagram before Friday? We need it for the review.',
    benefitsTitle: 'Build the workflow. Reuse the workspace.',
    benefits: [
      ['Work with selected content', 'Add detectors, views, transformations, and actions for supported clip formats. Keep the first version focused on one useful task.'],
      ['Use host-managed capabilities', 'Declare the input, model, or network access you need. ClipsX manages consent and provider credentials; your package works through the documented contract.'],
      ['Keep results useful', 'Transformer results remain attached to their source clip. People can inspect, compare, copy, or save them without replacing the original.'],
    ],
    stepsTitle: 'From source to your first local run',
    steps: [
      ['Build', 'Start with the Rewrite source and its pinned WebAssembly contract. Follow the guide to build a local archive.'],
      ['Validate', 'Run the package checks against the same host revision. Review the manifest, requested permissions, and generated archive.'],
      ['Try it in ClipsX', 'Import through Developer Mode, enable the package, and run it on harmless sample text. Inspect the result before copying it.'],
    ],
    boundaryTitle: 'Explicit permissions. Clear limits.',
    boundaries: [
      'Packages have no ambient clipboard history, filesystem, shell, or network access. Additional access goes through declared host capabilities.',
      'Model-backed workflows need a configured provider. Local views and transformations can work without an LLM, depending on the package.',
      'Validation and signatures help check compatibility and package provenance. They do not guarantee safe behavior or useful output.',
      'A local archive is for development. Registry distribution has a separate release and catalog review process.',
    ],
    contract: 'Read the extension contract', available: 'Available today: desktop extensions. A hosted public API is not available.',
    contributeTitle: 'Help build the ecosystem', contributeBody: 'Explore a package you use, report a reproducible issue, or discuss a new workflow before building it. Keep package work and desktop host changes in their respective repositories.',
    packages: 'Extension source and issues', host: 'Desktop source', issue: 'Report a desktop issue', docs: 'Developer documentation',
  },
  ja: {
    eyebrow: '開発者向け', title: 'コピーした内容を活かす拡張機能を作る。',
    description: 'コピーしたテキストに、便利な表示、変換、操作を追加できます。クリップボードの作業環境は ClipsX が提供し、拡張機能がワークフローを広げます。',
    start: '最初の拡張機能を作る（英語）', examples: '拡張機能の実装例を見る',
    demoTitle: 'ひとつのクリップから、使える結果へ。', demoBody: '公式の実装例 Rewrite は、選択したテキストを設定済みの生成モデルで変換し、結果を元のクリップに添付します。',
    demoNote: 'ワークフローと生成結果の説明用サンプルです。Rewrite にはローカル生成モデルが必要で、結果は確認する必要があります。',
    input: 'コピーしたテキスト', inputText: '金曜までに更新した図を送ってもらえる？レビューで使いたい',
    operation: 'Rewrite · Business', output: '添付された結果', outputText: '金曜日までに更新した図をお送りいただけますか。レビューで使用する予定です。',
    benefitsTitle: 'ワークフローを作り、作業環境を活用する。',
    benefits: [
      ['選択した内容を使う', '対応するクリップ形式に検出、表示、変換、操作を追加できます。まずはひとつの役立つ処理から始めてください。'],
      ['ホストが管理する機能を使う', '必要な入力、モデル、ネットワークへのアクセスを宣言します。同意とプロバイダーの認証情報は ClipsX が管理し、パッケージは文書化された契約を通じて処理します。'],
      ['結果を再利用する', '変換結果は元のクリップに添付されます。元の内容を置き換えずに、確認、比較、コピー、保存ができます。'],
    ],
    stepsTitle: 'ソースから最初のローカル実行まで',
    steps: [
      ['ビルドする', 'Rewrite のソースと固定された WebAssembly 契約から始め、ガイドに沿ってローカルアーカイブを作成します。'],
      ['検証する', '同じホストリビジョンのツールで検証します。マニフェスト、要求する権限、生成したアーカイブを確認してください。'],
      ['ClipsX で試す', '開発者モードで読み込み、有効にして、機密情報を含まないサンプルで実行します。コピーする前に結果を確認してください。'],
    ],
    boundaryTitle: '明示的な権限と、明確な制限。',
    boundaries: [
      'パッケージはクリップボード履歴、ファイルシステム、シェル、ネットワークへ自由にアクセスできません。追加のアクセスには、ホストの機能の宣言が必要です。',
      'モデルを使う処理にはプロバイダーの設定が必要です。ローカルの表示や変換は、パッケージによっては LLM なしで動作します。',
      '検証と署名は互換性やパッケージの出所の確認に役立ちますが、安全な動作や出力の有用性を保証するものではありません。',
      'ローカルアーカイブは開発用です。レジストリでの配布には別のリリースとカタログの確認プロセスがあります。',
    ],
    contract: '拡張機能の契約を読む（英語）', available: '現在利用できるのはデスクトップ拡張機能です。ホスト型の公開 API は提供していません。',
    contributeTitle: 'エコシステムを一緒に育てる', contributeBody: '使っているパッケージの実装を調べ、再現できる問題を報告し、新しいワークフローを提案してください。パッケージとデスクトップホストの変更は、それぞれのリポジトリで扱います。',
    packages: '拡張機能のソースと Issues（英語）', host: 'デスクトップのソース', issue: 'デスクトップの問題を報告（英語）', docs: '開発者ドキュメント（英語）',
  },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, '/developers', locale === 'ja' ? 'クリップボード拡張機能を作る' : 'Build clipboard extensions', copy[locale].description);
}

const textLink = 'focus-ring inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-violet-700 underline-offset-4 hover:underline dark:text-violet-300';
const packageSource = 'https://github.com/azure06/clipsx-extensions';

export default async function Developers({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = copy[locale];
  return (
    <div className="marketing-shell pb-24">
      <PageIntro eyebrow={c.eyebrow} title={c.title} description={c.description} />
      <div className="-mt-8 mb-16 flex flex-wrap justify-center gap-3">
        <a href={documentationConfig.rewriteExtension} className="button-primary focus-ring gap-2 px-5 py-3 text-sm">{c.start}<ArrowRight size={16} aria-hidden="true" /></a>
        <a href={packageSource} className="button-secondary focus-ring gap-2 px-5 py-3 text-sm">{c.examples}<ArrowUpRight size={16} aria-hidden="true" /></a>
      </div>
      <section aria-labelledby="extension-example" className="marketing-card mx-auto max-w-5xl overflow-hidden">
        <div className="border-b border-[var(--ui-border)] p-6 sm:p-8">
          <h2 id="extension-example" className="font-heading text-2xl font-bold text-[var(--ui-text)]">{c.demoTitle}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ui-text-muted)]">{c.demoBody}</p>
        </div>
        <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div><p className="mb-3 text-xs font-semibold text-[var(--ui-text-muted)]">{c.input}</p><p className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface-raised)] p-5 text-sm leading-7 text-[var(--ui-text)]">{c.inputText}</p></div>
          <p className="rounded-lg bg-[var(--ui-accent-subtle)] px-3 py-2 text-center font-mono text-xs text-[var(--ui-violet)]">{c.operation}</p>
          <div><p className="mb-3 text-xs font-semibold text-[var(--ui-text-muted)]">{c.output}</p><p className="rounded-lg border border-violet-500/30 bg-[var(--ui-accent-subtle)] p-5 text-sm leading-7 text-[var(--ui-text)]">{c.outputText}</p></div>
        </div>
        <p className="px-6 pb-6 text-xs leading-6 text-[var(--ui-text-muted)] sm:px-8">{c.demoNote}</p>
      </section>
      <section aria-labelledby="developer-benefits" className="mx-auto mt-20 max-w-5xl">
        <h2 id="developer-benefits" className="font-heading text-2xl font-bold text-[var(--ui-text)]">{c.benefitsTitle}</h2>
        <div className="mt-8 grid gap-8 md:grid-cols-3">{c.benefits.map(([title, body]) => <div key={title} className="border-t border-[var(--ui-border)] pt-5"><h3 className="font-heading text-lg font-semibold text-[var(--ui-text)]">{title}</h3><p className="mt-3 text-sm leading-7 text-[var(--ui-text-muted)]">{body}</p></div>)}</div>
      </section>
      <section aria-labelledby="first-extension" className="mx-auto mt-20 max-w-5xl scroll-mt-24">
        <h2 id="first-extension" className="font-heading text-2xl font-bold text-[var(--ui-text)]">{c.stepsTitle}</h2>
        <ol role="list" className="mt-8 grid gap-8 md:grid-cols-3">{c.steps.map(([title, body], index) => <li key={title}><span className="font-mono text-xs text-[var(--ui-violet)]">0{index + 1}</span><h3 className="mt-3 font-heading text-lg font-semibold text-[var(--ui-text)]">{title}</h3><p className="mt-3 text-sm leading-7 text-[var(--ui-text-muted)]">{body}</p></li>)}</ol>
        <a href={documentationConfig.rewriteExtension} className={`${textLink} mt-7`}>{c.start}<ArrowRight size={16} aria-hidden="true" /></a>
      </section>
      <section aria-labelledby="permission-boundary" className="mx-auto mt-20 max-w-5xl border-y border-[var(--ui-border)] py-10">
        <h2 id="permission-boundary" className="font-heading text-2xl font-bold text-[var(--ui-text)]">{c.boundaryTitle}</h2>
        <ul className="mt-5 max-w-3xl list-disc space-y-3 pl-5 text-sm leading-7 text-[var(--ui-text-muted)]">{c.boundaries.map(item => <li key={item}>{item}</li>)}</ul>
        <a href={`${siteConfig.repository}/blob/main/docs/EXTENSION_API_V3.md`} className={`${textLink} mt-6`}>{c.contract}<ArrowUpRight size={16} aria-hidden="true" /></a>
        <p className="mt-5 text-xs leading-6 text-[var(--ui-text-muted)]">{c.available}</p>
      </section>
      <section aria-labelledby="contribute" className="mx-auto mt-14 max-w-5xl">
        <h2 id="contribute" className="font-heading text-2xl font-bold text-[var(--ui-text)]">{c.contributeTitle}</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ui-text-muted)]">{c.contributeBody}</p>
        <div className="mt-6 flex flex-wrap gap-x-7 gap-y-4">{[[`${packageSource}/issues`, c.packages], [siteConfig.repository, c.host], [siteConfig.issues, c.issue], [documentationConfig.developerExtensions, c.docs]].map(([href, label]) => <a key={href} href={href} className={textLink}>{label}<ArrowUpRight size={14} aria-hidden="true" /></a>)}</div>
      </section>
    </div>
  );
}
