import type { Locale } from '@/i18n/config';

export const legalContact = 'support@clipsx.app';

// Publication date for the current free-service policy.
export const legalReview = {
  preparedDate: '2026-10-03',
  effectiveDate: '2026-10-03',
};

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  links?: { label: string; href: string }[];
};

export type LegalDocument = {
  title: string;
  summary: string;
  sections: LegalSection[];
};

const licenseUrl = 'https://github.com/azure06/clipsx/blob/main/LICENSE';

export const termsContent: Record<Locale, LegalDocument> = {
  en: {
    title: 'Terms of use',
    summary: 'ClipsX is a free, open-source desktop app. Accounts and hosted features are optional. These terms explain the services while preserving your rights under the software license and applicable law.',
    sections: [
      { id: 'about', title: 'About ClipsX', paragraphs: ['ClipsX is an independent project operated by an individual based in Japan. Questions about these terms or operator information can be sent to support@clipsx.app.'] },
      {
        id: 'software-license', title: 'Free software and its license',
        paragraphs: [
          'The desktop application is provided under the Apache License 2.0. That license governs use, modification, and redistribution. These website terms do not replace or restrict those permissions. Extensions and third-party components have their own accompanying licenses.',
          'Core desktop features are free and require no account. Pro is not available for purchase. Any future paid service will have its price and terms disclosed before payment.',
        ],
        links: [{ label: 'Read the desktop software license', href: licenseUrl }],
      },
      {
        id: 'hosted-services', title: 'Optional accounts and hosted services',
        paragraphs: [
          'These terms apply to the website, optional accounts, and supported settings sync. Vault is not currently available. Hosted access is separate from your rights to the desktop software.',
          'Keep sign-in and recovery methods secure. You retain your rights to your content; hosted features process it as described in the Privacy policy. You can request account closure from account settings or support@clipsx.app.',
        ],
      },
      { id: 'responsible-use', title: 'Responsible use', paragraphs: ['Use hosted services lawfully. Do not access other accounts without permission, bypass access controls, disrupt the service, or distribute malware. Hosted access may be restricted to address abuse, security threats, or legal requirements. This does not revoke permissions granted by the open-source license.'] },
      { id: 'availability', title: 'Availability and your data', paragraphs: ['Software and hosted features can change, be interrupted, or become unavailable. The free service has no service-level agreement or guaranteed support response. Keep independent copies of important information; clipboard history and optional sync should not be your only backup.'] },
      {
        id: 'warranty', title: 'Warranties and liability',
        paragraphs: [
          'The desktop software’s warranty disclaimer and liability provisions are in sections 7 and 8 of the Apache License 2.0, subject to applicable law. Hosted services are provided as available, without a promise of uninterrupted, error-free operation or suitability for every purpose, to the extent permitted by law.',
          'These terms do not exclude or limit liability that cannot lawfully be excluded or limited, including intentional misconduct or gross negligence where applicable. Mandatory consumer rights remain in place. Free software does not remove those rights.',
        ],
      },
      { id: 'sponsorship', title: 'Voluntary sponsorship', paragraphs: ['GitHub sponsorship supports the project. It is separate from a ClipsX subscription and does not, by itself, purchase Pro access, guaranteed support, or a service commitment. GitHub handles payments under its own terms and any benefits explicitly stated on the sponsor profile.'] },
      { id: 'law-and-changes', title: 'Applicable law and changes', paragraphs: ['These website terms are governed by Japanese law, subject to mandatory protections that apply where you live. Material updates will be identified here with their effective date. Updates do not retroactively change permissions granted under the software license. Contact support@clipsx.app with questions.'] },
    ],
  },
  ja: {
    title: '利用規約',
    summary: 'ClipsX は無料のオープンソース・デスクトップアプリです。アカウントとホスト型機能は任意で利用できます。本規約はサービスについて説明し、ソフトウェアライセンスと適用法令に基づく権利を尊重します。',
    sections: [
      { id: 'about', title: 'ClipsX について', paragraphs: ['ClipsX は日本を拠点とする個人が運営する独立したプロジェクトです。本規約や運営者情報に関するお問い合わせは support@clipsx.app までご連絡ください。'] },
      {
        id: 'software-license', title: '無料ソフトウェアとライセンス',
        paragraphs: [
          'デスクトップアプリは Apache License 2.0 で提供され、利用、改変、再配布には同ライセンスが適用されます。本サイト規約はその許諾を置き換えたり制限したりするものではありません。拡張機能と第三者のコンポーネントには、それぞれに付属するライセンスが適用されます。',
          '基本デスクトップ機能は無料で、アカウントは不要です。Pro は現在購入できません。今後有料サービスを提供する場合は、支払い受付前に価格と取引条件を明示します。',
        ],
        links: [{ label: 'デスクトップソフトウェアのライセンスを読む', href: licenseUrl }],
      },
      {
        id: 'hosted-services', title: '任意のアカウントとホスト型サービス',
        paragraphs: [
          '本規約はウェブサイト、任意のアカウント、対応設定の同期に適用されます。Vault は現在提供していません。ホスト型サービスへのアクセスとデスクトップソフトウェアに関する権利は別のものです。',
          'サインインと復旧に使う手段を安全に管理してください。コンテンツに関する権利は利用者に帰属し、ホスト型機能はプライバシーポリシーに従って処理します。アカウント設定または support@clipsx.app から閉鎖を申請できます。',
        ],
      },
      { id: 'responsible-use', title: '適切な利用', paragraphs: ['ホスト型サービスを適法に利用してください。他人のアカウントへの無断アクセス、アクセス制御の回避、サービスの妨害、マルウェアの配布は禁止します。不正利用、セキュリティ上の脅威、法令上の要請に対応するため、ホスト型サービスへのアクセスを制限する場合があります。これによりオープンソースライセンスに基づく許諾が取り消されることはありません。'] },
      { id: 'availability', title: '提供状況とデータの管理', paragraphs: ['ソフトウェアやホスト型機能は変更、中断、利用不能となる場合があります。無料サービスにはサービス水準の合意やサポートの回答保証はありません。重要な情報は別途保存し、クリップボード履歴や任意の同期だけをバックアップとして利用しないでください。'] },
      {
        id: 'warranty', title: '保証と責任',
        paragraphs: [
          'デスクトップソフトウェアの保証の否認と責任に関する条項は Apache License 2.0 の第7条と第8条に定められ、適用法令に従います。ホスト型サービスは法律で認められる範囲で提供可能な状態で提供し、中断や不具合がないこと、すべての目的に適することを約束するものではありません。',
          '本規約は法律上除外または制限できない責任を除外または制限するものではなく、適用される場合の故意または重大な過失による責任も含みます。消費者の強行法規上の権利は維持され、無料であることによって失われることはありません。',
        ],
      },
      { id: 'sponsorship', title: '任意のスポンサー支援', paragraphs: ['GitHub のスポンサー支援はプロジェクトを支えるものです。ClipsX の購読とは別であり、それ自体で Pro の利用権、サポートの保証、サービスの提供義務を購入するものではありません。支払いは GitHub が独自の規約とスポンサープロフィールに明示された特典に基づいて管理します。'] },
      { id: 'law-and-changes', title: '準拠法と変更', paragraphs: ['本サイト規約には日本法を適用します。ただし、利用者の居住地で適用される強行法規による保護を妨げません。重要な変更は本ページに適用開始日とともに表示します。変更によってソフトウェアライセンスの許諾が遡って変更されることはありません。ご不明な点は support@clipsx.app までご連絡ください。'] },
    ],
  },
};

export const privacyContent: Record<Locale, LegalDocument> = {
  en: {
    title: 'Privacy policy',
    summary: 'Core clipboard history stays on your device. Optional accounts and hosted features process additional data when you use them. Here is how those uses differ and how to contact us about your data.',
    sections: [
      { id: 'operator', title: 'Who to contact', paragraphs: ['ClipsX is operated by an individual based in Japan. Send privacy questions, requests, or complaints to support@clipsx.app. Required operator information and information about the handling and protection of your personal data are available on request without undue delay. Do not include passwords, recovery secrets, or clipboard contents in your message.'] },
      {
        id: 'local-data', title: 'Clipboard data on your device',
        paragraphs: [
          'Core desktop features store clipboard history, managed files, search indexes, and related local data on your device. Creating an account does not automatically upload your clipboard history.',
          'Optional intelligence uses the provider you configure. Ollama runs separately and can be used locally; information sent to a configured provider is handled by that provider. Extensions may access data or network services through permissions you grant. Review them before enabling them.',
        ],
      },
      {
        id: 'accounts-sync', title: 'Accounts and settings sync',
        paragraphs: [
          'Supabase processes sign-in information, email, account identity, and sessions to authenticate you and operate account features. If you choose Google or GitHub sign-in where available, that provider handles the sign-in and shares the profile information authorized by that flow.',
          'Settings sync stores selected preferences and extension or command choices. It does not include clipboard contents, files, notes, tags, credentials, local provider settings, or derived search data. Vault content is a separate feature.',
        ],
      },
      { id: 'vault', title: 'Vault availability', paragraphs: ['Vault is not currently available. Its planned end-to-end encryption is designed so the operator cannot decrypt your content. Losing all keys and recovery methods can make content permanently inaccessible. We will update this policy with the actual data handling before Vault becomes available.'] },
      {
        id: 'contact-payments', title: 'Messages and payments',
        paragraphs: [
          'Resend delivers the contact form’s name, email, subject, and message to the project’s contact mailbox so we can respond. Direct emails to support@clipsx.app are handled by the mailbox provider and operator.',
          'GitHub handles voluntary sponsorship payments on its platform under its own privacy policy. Pro and ClipsX billing are not active; the website does not currently accept Pro payments. We will update this policy before introducing paid services.',
        ],
      },
      {
        id: 'diagnostics', title: 'Diagnostics and website measurement',
        paragraphs: [
          'When reporting is enabled, Sentry receives technical error information to diagnose failures. Signed-in website reports may include an account identifier, verified email, profile name, and sign-in provider. ClipsX does not assign signed-out reports a persistent account identity. Desktop error reporting can be disabled in Settings; local diagnostic logs remain on the device.',
          'Vercel hosts the website. Web Analytics and Speed Insights measure visits and performance on selected public pages, outside Account and Vault pages. They are not used to send clipboard contents, Vault content, or search queries. Hosting and service providers also process technical connection information needed to deliver and protect their services.',
        ],
      },
      { id: 'browser-storage', title: 'Browser storage', paragraphs: ['Sign-in uses session cookies. Your theme choice is stored in the browser. Clearing browser storage can sign you out; it does not by itself delete your hosted account.'] },
      {
        id: 'providers-retention', title: 'Providers, retention, and deletion',
        paragraphs: [
          'Supabase, Vercel, Resend, Sentry, and the email provider process data for the purposes described above. Their infrastructure and support operations may process data outside Japan. Contact support@clipsx.app for information about your data and applicable overseas processing.',
          'Our retention policy is to keep personal data only as needed for the stated purpose, account operation, security, or legal obligations, and to delete or anonymize data when it is no longer needed. Contact messages are kept to handle the request and necessary follow-up. Provider logs and backups follow their service retention schedules rather than a single ClipsX-wide deadline.',
          'Account settings provides a closure request. Closure revokes access and removes or disables account and owned hosted data through the closure process. Verification history, records needed for security or legal obligations, provider logs, and backups may remain. We do not promise immediate removal from every system. Local desktop data and copies held by other people or devices need separate handling.',
        ],
        links: [
          { label: 'Supabase privacy policy', href: 'https://supabase.com/privacy' },
          { label: 'Vercel Web Analytics privacy', href: 'https://vercel.com/docs/analytics/privacy-policy' },
          { label: 'Resend privacy policy', href: 'https://resend.com/legal/privacy-policy' },
          { label: 'Sentry privacy policy', href: 'https://sentry.io/privacy/' },
          { label: 'GitHub privacy statement', href: 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement' },
        ],
      },
      {
        id: 'your-choices', title: 'Your choices and requests',
        paragraphs: [
          'Use core desktop features without an account, choose whether to use settings sync, disable desktop error reporting, and manage local history and extension permissions.',
          'Contact support@clipsx.app to request information about, correction of, or deletion of personal data, or to raise a privacy concern. We may need to verify your identity and explain records that must be retained or requests we cannot fulfill. Material updates will be shown here with their effective date.',
        ],
      },
    ],
  },
  ja: {
    title: 'プライバシーポリシー',
    summary: '基本機能のクリップボード履歴は端末内に保存されます。任意のアカウントやホスト型機能では利用時に追加のデータを処理します。本ページではその違いと、データに関するお問い合わせ方法を説明します。',
    sections: [
      { id: 'operator', title: 'お問い合わせ先', paragraphs: ['ClipsX は日本を拠点とする個人が運営しています。プライバシーに関する質問、請求、苦情は support@clipsx.app までご連絡ください。法令上必要な運営者情報、個人データの取り扱いと安全管理に関する情報は、ご本人の求めに応じて遅滞なく回答します。パスワード、復旧用の秘密情報、クリップボードの内容をメッセージに含めないでください。'] },
      {
        id: 'local-data', title: '端末内のクリップボードデータ',
        paragraphs: [
          '基本デスクトップ機能では、クリップボード履歴、管理ファイル、検索インデックス、関連するローカルデータを端末内に保存します。アカウントを作成しても、履歴が自動的にアップロードされることはありません。',
          '任意のインテリジェンス機能には利用者が設定したプロバイダーを使用します。Ollama は別のソフトウェアとして動作し、ローカルで利用できます。設定したプロバイダーへ送信した情報はそのプロバイダーが取り扱います。拡張機能は許可した権限を通じてデータやネットワークサービスにアクセスする場合があります。有効にする前に確認してください。',
        ],
      },
      {
        id: 'accounts-sync', title: 'アカウントと設定同期',
        paragraphs: [
          'Supabase は認証とアカウント機能の提供のため、サインイン情報、メール、アカウント識別情報、セッションを処理します。提供されている Google または GitHub サインインを選ぶと、そのプロバイダーが認証を処理し、認証手続で許可されたプロフィール情報を共有します。',
          '設定同期では選択された設定や拡張機能・コマンドの選択情報を保存します。クリップ内容、ファイル、メモ、タグ、認証情報、ローカルプロバイダー設定、派生した検索データは含みません。Vault コンテンツは別の機能です。',
        ],
      },
      { id: 'vault', title: 'Vault の提供状況', paragraphs: ['Vault は現在提供していません。予定しているエンドツーエンド暗号化は、運営者がコンテンツを復号できない設計です。すべての鍵と復旧手段を失うと、コンテンツに永久にアクセスできなくなる場合があります。提供開始前に実際のデータの取り扱いを本ポリシーに反映します。'] },
      {
        id: 'contact-payments', title: 'メッセージと支払い',
        paragraphs: [
          'Resend はお問い合わせフォームの氏名、メール、件名、本文をプロジェクトの受信メールボックスへ配信し、回答に使用します。support@clipsx.app への直接のメールは、メールボックスのプロバイダーと運営者が取り扱います。',
          '任意のスポンサー支援の支払いは、GitHub が独自のプライバシーポリシーに従ってプラットフォーム上で処理します。Pro と ClipsX の課金は有効になっておらず、現在サイトで Pro の支払いは受け付けていません。有料サービスの導入前に本ポリシーを更新します。',
        ],
      },
      {
        id: 'diagnostics', title: '診断とウェブ計測',
        paragraphs: [
          'エラー報告が有効な場合、Sentry は不具合の調査のため技術的なエラー情報を受け取ります。サインイン中のウェブレポートには、アカウント識別情報、確認済みメール、プロフィール名、認証プロバイダーを含む場合があります。サインアウト中のレポートに ClipsX が永続的なアカウント識別情報を付与することはありません。デスクトップのエラー報告は設定で無効にできます。ローカルの診断ログは端末内に残ります。',
          'ウェブサイトは Vercel がホストします。Web Analytics と Speed Insights は、アカウントと Vault のページを除く、選択された公開ページのアクセスと性能を計測します。クリップ内容、Vault コンテンツ、検索クエリの送信には使用しません。ホスティングなどのサービス提供者も、配信と保護に必要な技術的な接続情報を処理します。',
        ],
      },
      { id: 'browser-storage', title: 'ブラウザー内の保存', paragraphs: ['サインインにはセッション Cookie を使用し、テーマの選択をブラウザーに保存します。ブラウザー内の保存情報を消去するとサインアウトする場合があります。それだけでホスト上のアカウントが削除されるわけではありません。'] },
      {
        id: 'providers-retention', title: 'プロバイダー、保持、削除',
        paragraphs: [
          'Supabase、Vercel、Resend、Sentry、メールのプロバイダーは、上記の目的でデータを処理します。そのインフラやサポート業務により日本国外で処理する場合があります。ご自身のデータと適用される国外での処理については support@clipsx.app にお問い合わせください。',
          '当方の保持方針は、明示した目的、アカウントの運用、セキュリティ、法令上の義務に必要な期間だけ個人データを保持し、不要になれば削除または匿名化することです。お問い合わせは対応と必要な追加確認のため保持します。プロバイダーのログやバックアップは、ClipsX 共通の期限ではなく各サービスの保持スケジュールに従います。',
          'アカウント設定から閉鎖を申請できます。閉鎖処理ではアクセスを失効させ、アカウントと所有するホスト上のデータを削除または無効化します。検証履歴、セキュリティや法令上必要な記録、プロバイダーのログ、バックアップは残る場合があります。すべてのシステムからの即時削除は約束しません。ローカルデータや他の利用者・端末に保存されたコピーは別途対応が必要です。',
        ],
        links: [
          { label: 'Supabase のプライバシーポリシー', href: 'https://supabase.com/privacy' },
          { label: 'Vercel Web Analytics のプライバシー', href: 'https://vercel.com/docs/analytics/privacy-policy' },
          { label: 'Resend のプライバシーポリシー', href: 'https://resend.com/legal/privacy-policy' },
          { label: 'Sentry のプライバシーポリシー', href: 'https://sentry.io/privacy/' },
          { label: 'GitHub のプライバシー声明', href: 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement' },
        ],
      },
      {
        id: 'your-choices', title: '利用者の選択と請求',
        paragraphs: [
          '基本デスクトップ機能はアカウントなしで利用できます。設定同期の利用を選び、デスクトップのエラー報告を無効にし、ローカルの履歴や拡張機能の権限を管理できます。',
          '個人データについての情報、訂正、削除の請求や、プライバシーに関する苦情は support@clipsx.app までご連絡ください。本人確認を行い、保持が必要な記録や応じられない請求について説明する場合があります。重要な変更は本ページに適用開始日とともに表示します。',
        ],
      },
    ],
  },
};
