"use client";

import { useState } from 'react';
import { ArrowRight, Languages } from 'lucide-react';
import type { Locale } from '@/i18n/config';
import { workflowExamples } from '@/content/workflow-examples';
import styles from './home-workflows.module.css';

export function RewriteExample({ locale }: { locale: Locale }) {
  const c = workflowExamples[locale];
  const [operation, setOperation] = useState(0);

  return (
    <figure className={styles.rewriteExample}>
      <div className={styles.rewriteToolbar}>
        <span><Languages size={16} aria-hidden="true" /> Rewrite</span>
        <div role="group" aria-label={locale === 'ja' ? '文章の変換' : 'Transform text'}>
          {c.operations.map((label, index) => (
            <button key={label} type="button" aria-pressed={operation === index}
              className="focus-ring" onClick={() => setOperation(index)}>{label}</button>
          ))}
        </div>
      </div>
      <div className={styles.rewriteComparison}>
        <div><span>{c.original}</span><p>{c.originalText}</p></div>
        <ArrowRight size={18} aria-hidden="true" className={styles.rewriteArrow} />
        <div aria-live="polite"><span>{c.result}</span><p>{c.outputs[operation]}</p></div>
      </div>
      <figcaption>{c.illustrative}</figcaption>
    </figure>
  );
}
