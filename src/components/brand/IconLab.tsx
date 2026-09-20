"use client";

import { useId, useState } from "react";
import styles from "./icon-lab.module.css";

const pathTop = "M1592.5 583.87c0-22.48-16.13-41.72-38.27-45.64L930.26 427.71l-1.08-.19-456.23-80.8c-28.39-5.03-54.44 16.81-54.44 45.64v678.92c0 26.65 22.42 47.82 49.03 46.28l419.05-24.25c24.52-1.42 43.68-21.72 43.68-46.28V808.45c0-26.69 22.48-47.86 49.11-46.27l564.01 33.63c26.64 1.59 49.11-19.59 49.11-46.27V583.87Z";
const pathBottom = "M1243.94 836.57v212.87c0 20.91-16.29 38.2-37.17 39.45l-845.11 50.39c-20.88 1.24-37.17 18.54-37.17 39.45v315.63c0 24.58 22.21 43.2 46.41 38.91l873.03-154.62.84-.15 262.51-46.49c18.87-3.34 32.63-19.75 32.63-38.91V849.13c0-20.94-16.33-38.24-37.24-39.45l-216.94-12.55c-22.67-1.32-41.79 16.72-41.79 39.44Z";

type Variant = {
  id: string;
  number: string;
  name: string;
  note: string;
  top: [string, string];
  bottom: [string, string];
  tile: [string, string];
  lightTile?: boolean;
  outline?: boolean;
};

const variants: Variant[] = [
  { id: "brand", number: "01", name: "Brand blue", note: "Current full-color mark", top: ["#0086ff", "#1170d1"], bottom: ["#0e86fd", "#1770cf"], tile: ["#ffffff", "#edf1f8"], lightTile: true },
  { id: "slate", number: "02", name: "Slate violet", note: "Quiet, utility-first", top: ["#b4ccea", "#9a8cc4"], bottom: ["#93aecf", "#8579af"], tile: ["#15253b", "#08121f"] },
  { id: "accent", number: "03", name: "Electric accent", note: "Closest to the product gradient", top: ["#57c0ff", "#ad87ff"], bottom: ["#45b4ff", "#8f6af2"], tile: ["#172033", "#080d1b"] },
  { id: "ink", number: "04", name: "Ink monochrome", note: "For light interface chrome", top: ["#334155", "#172033"], bottom: ["#475569", "#182238"], tile: ["#ffffff", "#edf1f8"], lightTile: true },
  { id: "pearl", number: "05", name: "Pearl monochrome", note: "Adaptive: ink on light, pearl on dark", top: ["#f3f4f6", "#aab4c4"], bottom: ["#d9e0ea", "#929eaf"], tile: ["#172033", "#080d1b"] },
  { id: "outline", number: "06", name: "Outline", note: "Lighter visual weight", top: ["#f3f4f6", "#f3f4f6"], bottom: ["#cbd5e1", "#cbd5e1"], tile: ["#172033", "#080d1b"], outline: true },
];

function Mark({ variant, tile = false, label, className }: { variant: Variant; tile?: boolean; label?: string; className?: string }) {
  const uid = useId().replaceAll(":", "");
  const topId = `top-${variant.id}-${uid}`;
  const bottomId = `bottom-${variant.id}-${uid}`;
  const tileId = `tile-${variant.id}-${uid}`;
  const topClipId = `top-clip-${variant.id}-${uid}`;
  const bottomClipId = `bottom-clip-${variant.id}-${uid}`;
  const seamMaskId = `seam-${variant.id}-${uid}`;
  return (
    <svg className={className} viewBox="0 0 1920 1920" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <defs>
        <linearGradient id={topId} gradientUnits="userSpaceOnUse" x1="324" y1="940" x2="1592" y2="940"><stop stopColor={variant.top[0]} /><stop offset="1" stopColor={variant.top[1]} /></linearGradient>
        <linearGradient id={bottomId} gradientUnits="userSpaceOnUse" x1="324" y1="940" x2="1592" y2="940"><stop stopColor={variant.bottom[0]} /><stop offset="1" stopColor={variant.bottom[1]} /></linearGradient>
        <linearGradient id={tileId} x1="0" y1="0" x2="0" y2="1"><stop stopColor={variant.tile[0]} /><stop offset="1" stopColor={variant.tile[1]} /></linearGradient>
        {variant.outline && <>
          <clipPath id={topClipId}><path d={pathTop} /></clipPath>
          <clipPath id={bottomClipId}><path d={pathBottom} /></clipPath>
          <mask id={seamMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1920">
            <rect width="1920" height="1920" fill="white" />
            <path d={pathBottom} fill="black" stroke="black" strokeWidth="22" strokeLinejoin="round" />
          </mask>
        </>}
      </defs>
      {tile && <><rect width="1920" height="1920" rx="400" fill={`url(#${tileId})`} /><rect x="8" y="8" width="1904" height="1904" rx="392" fill="none" stroke={variant.lightTile ? "#18223818" : "#ffffff18"} strokeWidth="16" /></>}
      <g transform={tile ? "translate(202 202) scale(.79)" : undefined}>
        {variant.outline ? <>
          <path fill="none" stroke={variant.top[0]} strokeWidth="60" strokeLinejoin="round" clipPath={`url(#${topClipId})`} mask={`url(#${seamMaskId})`} d={pathTop} />
          <path fill="none" stroke={variant.bottom[0]} strokeWidth="60" strokeLinejoin="round" clipPath={`url(#${bottomClipId})`} d={pathBottom} />
        </> : <>
          <path fill={`url(#${topId})`} d={pathTop} />
          <path fill={`url(#${bottomId})`} d={pathBottom} />
        </>}
      </g>
    </svg>
  );
}

export function IconLab() {
  const [selectedId, setSelectedId] = useState("pearl");
  const selected = variants.find((variant) => variant.id === selectedId) ?? variants[0];
  const lightContext = selected.id === "pearl"
    ? variants.find((variant) => variant.id === "ink") ?? selected
    : selected;

  return (
    <div className={styles.page}>
      <div className={styles.gridLine} aria-hidden="true" />
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Identity reference · live contexts</p>
        <h1>Choose the mark where it has to work.</h1>
        <p className={styles.lead}>A logo can look convincing at 184 pixels and disappear at 20. Select a direction, then judge it in the header, browser tab, launcher tile, and both theme surfaces.</p>
        <div className={styles.chips}><span>Actual geometry</span><span>Light + dark chrome</span><span>16–48 px checks</span><span>One selected context</span></div>
      </header>

      <section aria-labelledby="candidates-title" className={styles.section}>
        <div className={styles.sectionHeading}><div><p>Candidate set</p><h2 id="candidates-title">Six useful directions</h2></div><span>Select a tile to update every context below.</span></div>
        <div className={styles.candidates}>
          {variants.map((variant) => (
            <button key={variant.id} type="button" aria-pressed={selectedId === variant.id} onClick={() => setSelectedId(variant.id)} className={styles.candidate}>
              <span className={styles.artboard}><Mark variant={variant} tile label={`${variant.name} icon`} /></span>
              <span className={styles.candidateMeta}><span>{variant.number}</span><strong>{variant.name}</strong></span>
              <small>{variant.note}</small>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="context-title" className={`${styles.section} ${styles.contextSection}`}>
        <div className={styles.sectionHeading}><div><p>Selected · {selected.number}</p><h2 id="context-title">{selected.name} in context</h2></div><span>Look for silhouette, seam clarity, and contrast—not decoration.</span></div>
        <div className={styles.contextGrid}>
          <div className={styles.chromeStack}>
            <div className={`${styles.headerMock} ${styles.lightChrome}`}><div><Mark variant={lightContext} /><b>CLIPS<span>X</span></b></div><nav>Product&nbsp;&nbsp;&nbsp; Developers&nbsp;&nbsp;&nbsp; Docs&nbsp;&nbsp;&nbsp; Pricing</nav><i>Get ClipsX →</i></div>
            <div className={`${styles.headerMock} ${styles.darkChrome}`}><div><Mark variant={selected} /><b>CLIPS<span>X</span></b></div><nav>Product&nbsp;&nbsp;&nbsp; Developers&nbsp;&nbsp;&nbsp; Docs&nbsp;&nbsp;&nbsp; Pricing</nav><i>Get ClipsX →</i></div>
            <div className={styles.transparentPair}>
              <div className={styles.lightField}><Mark variant={lightContext} /><span>Light surface</span></div>
              <div className={styles.darkField}><Mark variant={selected} /><span>Dark surface</span></div>
            </div>
          </div>
          <aside className={styles.utilityColumn}>
            <div className={styles.browser}><span className={styles.browserDots}>● ● ●</span><div><Mark variant={selected} /><b>ClipsX</b></div></div>
            <div className={styles.launcher}><Mark variant={selected} tile /><span /><div className={styles.finder}>F</div></div>
            <div><p className={styles.utilityLabel}>Actual favicon sizes</p><div className={styles.sizes}>{[16, 20, 24, 32, 48].map((size) => <div key={size}><span style={{ width: size, height: size }}><Mark variant={selected} tile /></span><small>{size}</small></div>)}</div></div>
          </aside>
        </div>
      </section>

      <section className={`${styles.section} ${styles.palette}`} aria-labelledby="palette-title">
        <div><p className={styles.eyebrow}>Palette relationship</p><h2 id="palette-title">The mark should belong to the interface.</h2><p>These are the current semantic anchors. A winning icon should stay identifiable beside them without introducing a second brand language.</p></div>
        <div className={styles.swatches}>{[["Canvas","#f6f8fc"],["Ink","#182238"],["Blue","#2563eb"],["Violet","#6d28d9"],["Fuchsia","#c026d3"],["Night","#080d1b"]].map(([name,color]) => <div key={name}><span style={{ background: color }} /><b>{name}</b><code>{color}</code></div>)}</div>
      </section>
    </div>
  );
}
