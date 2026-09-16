import type { Metadata } from "next";
import {
  ArrowRight,
  Check,
  Clock3,
  Layers,
  Search,
  Settings2,
  SlidersHorizontal,
} from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import type { Locale } from "@/i18n/config";
import { pricingFeatureGroups } from "@/config/pricing";
import styles from "./pricing.module.css";

const copy = {
  en: {
    metadata: [
      "Pricing & features",
      "Explore the current ClipsX Free plan, feature requirements, and the status of a future paid plan.",
    ],
    eyebrow: "Pricing",
    title: "Plans and features.",
    intro:
      "See what’s included, what needs a little setup, and where the plans stand. All current features are included in Free. A paid plan is planned but not yet available.",
    current: "Current plan",
    free: "Free",
    freeBody:
      "The desktop experience, including optional local intelligence and extensions.",
    price: "$0",
    priceNote: "No subscription required",
    freeItems: [
      "Rich history, search, and organization",
      "Meaning Search and Recall with local models",
      "Extensions and supported settings sync",
    ],
    download: "Get ClipsX",
    compare: "Explore included features",
    planned: "Planned",
    paid: "Paid plan",
    paidBody:
      "An additional tier is being considered. Its scope, benefits, and pricing have not been finalized.",
    tba: "To be announced",
    paidNote: "Not available for purchase",
    paidItems: [
      ["Price & billing", "Not yet set"],
      ["Additional benefits", "Not yet finalized"],
      ["Launch date", "Not yet announced"],
    ],
    statusLink: "About the planned tier",
    inventory: "Feature details",
    inventoryTitle: "What you can use today.",
    inventoryBody:
      "Every feature below is part of Free. The notes explain device, model, and account requirements—not extra ClipsX charges.",
    releaseNote:
      "Availability depends on your operating system and installed build.",
    releaseLink: "Check available downloads",
    feature: "Feature",
    access: "Free plan",
    requirements: "Setup & availability",
    included: "Included",
    jump: "Browse feature groups",
    futureLabel: "Looking ahead",
    futureTitle: "A paid tier, when the details are ready.",
    futureBody:
      "Optional hosted services are one possible direction. No paid-only feature list, allowance, or launch date is confirmed. This page will show the scope and pricing before a paid plan becomes available.",
    futureFoot: "The feature list above describes the current Free plan.",
    faqTitle: "Before you get started.",
    faqs: [
      [
        "Is Free a trial?",
        "No. The current Free plan does not require a subscription. The features listed here are included, with the setup and platform requirements shown alongside them.",
      ],
      [
        "Are Meaning Search and Recall included?",
        "Yes. Both are included in Free and run through a local Ollama connection. You install the models: Meaning Search needs an embedding model, and Recall needs a generation model. Speed, memory use, and language quality depend on your hardware and model.",
      ],
      [
        "Do I need an account?",
        "Core desktop features do not require an account. Supported settings and extension-choice sync are optional and require sign-in. Your clipboard history, files, and local model settings are not part of that sync.",
      ],
      [
        "Can I subscribe to the paid plan?",
        "Not yet. There is no public paid-plan checkout, trial, or finalized price. The planned tier is shown here to explain its status.",
      ],
      [
        "Does “included” mean every feature works on every platform?",
        "No. Formats, OCR providers, sharing, and native integrations depend on the operating system and installed build. Extensions may need compatible packages and explicit permissions. The Download page lists available builds.",
      ],
    ],
    close: "Take a closer look.",
    closeBody:
      "Explore the desktop workflow or find an available build for your device.",
    product: "Explore the product",
  },
  ja: {
    metadata: [
      "料金と機能",
      "ClipsX の現在の Free プラン、機能ごとの利用条件、今後の有料プランの状況を確認できます。",
    ],
    eyebrow: "料金",
    title: "プランと機能。",
    intro:
      "含まれる機能、必要な設定、各プランの状況をご案内します。現在の機能はすべて Free に含まれます。有料プランは計画中で、まだ利用できません。",
    current: "現在のプラン",
    free: "Free",
    freeBody: "任意のローカル AI と拡張機能を含む、デスクトップの機能。",
    price: "¥0",
    priceNote: "サブスクリプション不要",
    freeItems: [
      "リッチな履歴、検索、整理",
      "ローカルモデルによる意味検索と Recall",
      "拡張機能と対応する設定の同期",
    ],
    download: "ClipsX を入手",
    compare: "含まれる機能を見る",
    planned: "計画中",
    paid: "有料プラン",
    paidBody:
      "追加のプランを検討しています。対象機能、特典、料金はまだ確定していません。",
    tba: "後日発表",
    paidNote: "現在は購入できません",
    paidItems: [
      ["料金と請求周期", "未定"],
      ["追加の特典", "未確定"],
      ["提供開始日", "未発表"],
    ],
    statusLink: "有料プランの状況",
    inventory: "機能の詳細",
    inventoryTitle: "現在利用できる機能。",
    inventoryBody:
      "以下はすべて Free に含まれます。注記は端末、モデル、アカウントの利用条件を説明しており、ClipsX の追加料金ではありません。",
    releaseNote: "利用できる機能は OS と導入したビルドによって異なります。",
    releaseLink: "配布中のビルドを確認",
    feature: "機能",
    access: "Free プラン",
    requirements: "設定と利用条件",
    included: "含まれます",
    jump: "機能カテゴリを選ぶ",
    futureLabel: "今後の予定",
    futureTitle: "有料プランの詳細は、決まり次第。",
    futureBody:
      "任意のホスト型サービスなどを検討しています。有料限定機能、利用枠、提供開始日は未確定です。有料プランの提供前に、このページで対象機能と料金をご案内します。",
    futureFoot: "上の機能一覧は、現在の Free プランの内容です。",
    faqTitle: "使い始める前に。",
    faqs: [
      [
        "Free は試用版ですか？",
        "いいえ。現在の Free プランにサブスクリプションは不要です。一覧の機能は、それぞれの設定・OS 条件のもとで利用できます。",
      ],
      [
        "意味検索と Recall も含まれますか？",
        "はい。どちらも Free に含まれ、ローカルの Ollama 接続で動作します。モデルは自分で導入します。意味検索には埋め込みモデル、Recall には文章生成モデルが必要です。速度、メモリ使用量、言語品質は端末とモデルによって異なります。",
      ],
      [
        "アカウントは必要ですか？",
        "デスクトップの基本機能には不要です。対応設定と拡張機能の選択情報の同期は任意で、サインインが必要です。クリップボード履歴、ファイル、ローカルモデル設定はこの同期に含まれません。",
      ],
      [
        "有料プランを契約できますか？",
        "まだ契約できません。有料プランの一般向け購入、試用、確定した料金はありません。ここでは計画の状況をご案内しています。",
      ],
      [
        "すべての OS で全機能を使えますか？",
        "形式、OCR、共有、ネイティブ連携は OS と導入したビルドによって異なります。拡張機能には互換パッケージと権限の承認が必要な場合があります。配布中のビルドはダウンロードページで確認できます。",
      ],
    ],
    close: "使い方を、もう少し詳しく。",
    closeBody:
      "デスクトップの操作を確認するか、お使いの端末向けのビルドを探せます。",
    product: "製品を見る",
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: copy[locale].metadata[0],
    description: copy[locale].metadata[1],
  };
}

export default async function Pricing({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = copy[locale];
  const icons = [Layers, Search, SlidersHorizontal, Settings2];
  return (
    <div className={styles.page} lang={locale}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>{c.eyebrow}</p>
        <h1>{c.title}</h1>
        <p className={styles.intro}>{c.intro}</p>
      </header>
      <section className={styles.plans} aria-label={c.title}>
        <article className={styles.freePlan}>
          <div className={styles.planTop}>
            <span className={styles.badge}>
              <span aria-hidden="true" />
              {c.current}
            </span>
            <Layers size={20} aria-hidden="true" />
          </div>
          <h2>{c.free}</h2>
          <p className={styles.planBody}>{c.freeBody}</p>
          <div className={styles.price}>
            <strong>{c.price}</strong>
            <span>{c.priceNote}</span>
          </div>
          <ul className={styles.planList}>
            {c.freeItems.map((item) => (
              <li key={item}>
                <Check size={16} aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <Link href="/download" className={styles.primary}>
            {c.download}
            <ArrowRight size={16} />
          </Link>
          <a className={styles.planLink} href="#features">
            {c.compare}
            <ArrowRight size={14} />
          </a>
        </article>
        <article className={styles.paidPlan}>
          <div className={styles.planTop}>
            <span className={styles.badge}>
              <Clock3 size={12} aria-hidden="true" />
              {c.planned}
            </span>
          </div>
          <h2>{c.paid}</h2>
          <p className={styles.planBody}>{c.paidBody}</p>
          <div className={styles.price}>
            <strong className={styles.unknownPrice}>{c.tba}</strong>
            <span>{c.paidNote}</span>
          </div>
          <dl className={styles.planFacts}>
            {c.paidItems.map(([term, value]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <a className={styles.secondary} href="#planned-tier">
            {c.statusLink}
            <ArrowRight size={16} />
          </a>
        </article>
      </section>
      <section id="features" className={styles.inventory}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>{c.inventory}</p>
            <h2>{c.inventoryTitle}</h2>
          </div>
          <p>{c.inventoryBody}</p>
        </div>
        <nav className={styles.groupNav} aria-label={c.jump}>
          {pricingFeatureGroups.map((group, index) => {
            const Icon = icons[index];
            return (
              <a key={group.id} href={`#${group.id}`}>
                <Icon size={15} aria-hidden="true" />
                {group.title[locale]}
              </a>
            );
          })}
        </nav>
        <p className={styles.releaseNote}>
          {c.releaseNote}{" "}
          <Link href="/download">
            {c.releaseLink}
            <ArrowRight size={12} />
          </Link>
        </p>
        {pricingFeatureGroups.map((group, index) => {
          const Icon = icons[index];
          return (
            <section
              id={group.id}
              className={styles.featureGroup}
              key={group.id}
              aria-labelledby={`${group.id}-title`}
            >
              <div className={styles.groupHeading}>
                <Icon size={20} aria-hidden="true" />
                <div>
                  <h3 id={`${group.id}-title`}>{group.title[locale]}</h3>
                  <p>{group.description[locale]}</p>
                </div>
              </div>
              <table className={styles.featureTable} role="table">
                <caption className={styles.srOnly}>
                  {group.title[locale]} — {c.access}
                </caption>
                <thead role="rowgroup">
                  <tr role="row">
                    <th scope="col" role="columnheader">
                      {c.feature}
                    </th>
                    <th scope="col" role="columnheader">
                      {c.access}
                    </th>
                    <th scope="col" role="columnheader">
                      {c.requirements}
                    </th>
                  </tr>
                </thead>
                <tbody role="rowgroup">
                  {group.features.map((feature) => (
                    <tr key={feature.name.en} role="row">
                      <th scope="row" role="rowheader">
                        {feature.href ? (
                          <Link href={feature.href}>
                            {feature.name[locale]}
                            <ArrowRight size={13} />
                          </Link>
                        ) : (
                          <span>{feature.name[locale]}</span>
                        )}
                        <p>{feature.description[locale]}</p>
                      </th>
                      <td className={styles.access} role="cell">
                        <span>
                          <Check size={15} aria-hidden="true" />
                          {c.included}
                        </span>
                      </td>
                      <td className={styles.requirement} role="cell">
                        {feature.requirement[locale]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}
      </section>
      <section id="planned-tier" className={styles.future}>
        <div>
          <p className={styles.eyebrow}>{c.futureLabel}</p>
          <h2>{c.futureTitle}</h2>
        </div>
        <div>
          <p>{c.futureBody}</p>
          <span>{c.futureFoot}</span>
        </div>
      </section>
      <section className={styles.faq}>
        <div>
          <p className={styles.eyebrow}>
            {locale === "ja" ? "よくある質問" : "Questions & answers"}
          </p>
          <h2>{c.faqTitle}</h2>
        </div>
        <div>
          {c.faqs.map(([question, answer]) => (
            <details key={question}>
              <summary>
                {question}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
      <section className={styles.closing}>
        <div>
          <h2>{c.close}</h2>
          <p>{c.closeBody}</p>
        </div>
        <div>
          <Link href="/download" className={styles.primary}>
            {c.download}
            <ArrowRight size={16} />
          </Link>
          <Link href="/product" className={styles.secondary}>
            {c.product}
          </Link>
        </div>
      </section>
    </div>
  );
}
