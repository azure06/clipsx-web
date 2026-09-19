import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, ChevronDown, FileText, Code2, Image, Link2, Files, Laptop, Sparkles, Cloud, ShieldCheck } from "lucide-react";
import { ProductRepresentationGraph } from "@/components/marketing/ProductRepresentationGraph";
import { setRequestLocale } from "next-intl/server";
import styles from "@/components/marketing/product.module.css";
import { productContent } from "@/content/product";
import { Link } from "@/i18n/routing";
import type { Locale } from "@/i18n/config";
import { documentationConfig } from "@/config/site";

const ids = ["content", "search", "reuse", "extensions", "privacy", "questions"];

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const c = productContent[locale];
  return { title: c.metaTitle, description: c.description, alternates: { canonical: `/${locale}/product`, languages: { en: "/en/product", ja: "/ja/product" } } };
}

export default async function ProductPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const c = productContent[locale];
  const formatIcons = [FileText, Code2, Image, Link2, Files];
  const privacyIcons = [Laptop, Sparkles, Cloud, ShieldCheck];
  return <div className={styles.page} lang={locale}><div className={styles.shell}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>{c.eyebrow}</p><h1>{c.title}</h1><p className={styles.intro}>{c.intro}</p>
        <div className={styles.actions}><Link href="/download" className={styles.primary}>{c.get}<ArrowRight size={16} aria-hidden="true" /></Link><a href={documentationConfig.gettingStarted} target="_blank" rel="noreferrer" className={styles.link}>{c.docs}<ArrowUpRight size={16} aria-hidden="true" /></a></div>
      </div>
      <aside className={styles.overview} aria-label={c.overview}><p className={styles.eyebrow}>{c.overview}</p><dl>{c.facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></aside>
    </header>
    <div className={styles.layout}>
      <nav className={styles.navigation} aria-label={c.contents}><p>{c.contents}</p>{c.nav.map((label, i) => <a key={label} href={`#${ids[i]}`}>{label}<ArrowRight size={13} aria-hidden="true" /></a>)}</nav>
      <div className={styles.article}>
        <section id="content" aria-labelledby="content-title" className={styles.section}><p className={styles.eyebrow}>{c.nav[0]}</p><h2 id="content-title">{c.captureTitle}</h2><p>{c.captureBody}</p>
          <div className={styles.captureVisual}><div className={styles.captureSource}><FileText size={24} aria-hidden="true" /><span>{locale === "ja" ? "ブラウザからコピー" : "Copied from a browser"}</span><strong>{locale === "ja" ? "ひとつのクリップ。" : "One captured clip."}</strong><p>{locale === "ja" ? "必要な表現を、まとめて保持。" : "Useful representations, kept together."}</p></div><div className={styles.captureForms}><div><Code2 size={18} aria-hidden="true" /><span>HTML</span><code>&lt;h1&gt;ClipsX&lt;/h1&gt;</code></div><div><FileText size={18} aria-hidden="true" /><span>{locale === "ja" ? "プレーンテキスト" : "Plain text"}</span><code>ClipsX</code></div></div></div>
          <dl className={styles.formats}>{c.formats.map(([title, body], index) => { const Icon = formatIcons[index]; return <div key={title}><dt><Icon size={19} aria-hidden="true" />{title}</dt><dd>{body}</dd></div>; })}</dl><p className={styles.note}>{c.captureNote}</p>
        </section>
        <section id="search" aria-labelledby="search-title" className={styles.section}><p className={styles.eyebrow}>{c.nav[1]}</p><h2 id="search-title">{c.searchTitle}</h2><p>{c.searchBody}</p><dl className={styles.features}>{c.searchRows.map(([title, body]) => <div key={title}><dt>{title}</dt><dd>{body}</dd></div>)}</dl></section>
        <section id="reuse" aria-labelledby="reuse-title" className={styles.section}><p className={styles.eyebrow}>{c.nav[2]}</p><h2 id="reuse-title">{c.reuseTitle}</h2><p>{c.reuseBody}</p><ProductRepresentationGraph locale={locale} /><ol className={styles.steps}>{c.reuseRows.map(([title, body]) => <li key={title}><h3>{title}</h3><p>{body}</p></li>)}</ol></section>
        <section id="extensions" aria-labelledby="extensions-title" className={styles.extension}><p className={styles.eyebrow}>{c.nav[3]}</p><h2 id="extensions-title">{c.extensionTitle}</h2><p>{c.extensionBody}</p><Link href="/extensions" className={styles.link}>{c.extensionLink}<ArrowRight size={16} aria-hidden="true" /></Link></section>
        <section id="privacy" aria-labelledby="privacy-title" className={styles.section}><p className={styles.eyebrow}>{c.nav[4]}</p><h2 id="privacy-title">{c.privacyTitle}</h2><p>{c.privacyBody}</p><dl className={styles.boundaries}>{c.privacyRows.map(([title, body], index) => { const Icon = privacyIcons[index]; return <div key={title}><dt><Icon size={21} aria-hidden="true" />{title}</dt><dd>{body}</dd></div>; })}</dl><div className={styles.actions}><a href={documentationConfig.privacy} target="_blank" rel="noreferrer" className={styles.link}>{c.privacyLink}<ArrowUpRight size={16} aria-hidden="true" /></a><a href={documentationConfig.sync} target="_blank" rel="noreferrer" className={styles.link}>{c.syncLink}<ArrowUpRight size={16} aria-hidden="true" /></a></div></section>
        <section id="questions" aria-labelledby="questions-title" className={styles.section}><p className={styles.eyebrow}>{c.nav[5]}</p><h2 id="questions-title">{c.faqTitle}</h2><div className={styles.questions}>{c.questions.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={18} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div></section>
        <footer className={styles.close}><div><h2>{c.closeTitle}</h2><p>{c.closeBody}</p></div><Link href="/download" className={styles.primary}>{c.get}<ArrowRight size={16} aria-hidden="true" /></Link></footer>
      </div>
    </div>
  </div></div>;
}
