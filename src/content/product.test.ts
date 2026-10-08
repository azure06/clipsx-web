import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { productJourneys, productSectionIds } from './product';
import { getDocumentationConfig } from '../config/site';

describe('Product setup journey', () => {
  const page = readFileSync('src/app/[locale]/product/page.tsx', 'utf8');
  it('preserves prior anchors while leading with the three optional capabilities', () => {
    expect(productSectionIds.slice(0, 4)).toEqual(['meaning-search', 'recall', 'extensions', 'getting-started']);
    for (const id of productSectionIds) expect(page).toContain(`id="${id}"`);
    const positions = productSectionIds.map(id => page.indexOf(`id="${id}"`));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
  it('provides localized benefits, prerequisites, examples, and distinct setup destinations', () => {
    for (const locale of ['en', 'ja'] as const) {
      const content = productJourneys[locale];
      const docs = getDocumentationConfig(locale);
      for (const capability of ['meaning', 'recall', 'extensions'] as const) {
        expect(content[capability].body.length).toBeGreaterThan(30);
        expect(content[capability].requirement).toBeTruthy();
        expect(content[capability].explore).not.toEqual(content[capability].setup);
      }
      expect(content.recall.sources).toHaveLength(2);
      expect(new Set([docs.meaningSearch, docs.recall, docs.extensions]).size).toBe(3);
      expect(content.example).toBeTruthy();
    }
    expect(page).toContain("pageMetadata(locale, '/product'");
    expect(page).toContain('documentationConfig.gettingStarted');
  });
});
