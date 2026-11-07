import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { blogPosts } from '@/content/blog';
import { pick } from '@/content/marketing';
import { BlogComparison, BlogWorkflow, BlogFigure, BlogBeforeAfter } from './BlogVisuals';

describe('article visual explanations', () => {
  it('keeps the original and observed suggestion in English in both editions', () => {
    const example = blogPosts.flatMap(post => post.sections).find(section => section.rewriteExample)!.rewriteExample!;
    for (const locale of ['en', 'ja'] as const) {
      const html = renderToStaticMarkup(createElement(BlogBeforeAfter, { example, locale }));
      expect(html.match(/lang="en"/g)).toHaveLength(2);
      expect(html).toContain(pick(example.after, locale));
      expect(html).toContain(pick(example.note, locale));
    }
    expect(example.before.en).toBe(example.before.ja);
    expect(example.after.en).toBe(example.after.ja);
  });
  it('makes the retrieved image available at full size with localized context', () => {
    const image = blogPosts.flatMap(post => post.sections).find(section => section.image)!.image!;
    for (const locale of ['en', 'ja'] as const) {
      const html = renderToStaticMarkup(createElement(BlogFigure, { image, locale }));
      expect(html).toContain(`href="${image.src}"`);
      expect(html).toContain(pick(image.alt, locale));
      expect(html).toContain(pick(image.caption, locale));
      expect(html).toContain('loading="lazy"');
    }
  });
  it('keeps workflow meaning in visible localized text without relying on SVG icons', () => {
    const flow = blogPosts.find(post => post.overview)!.overview!;
    for (const locale of ['en', 'ja'] as const) {
      const html = renderToStaticMarkup(createElement(BlogWorkflow, { flow, locale }));
      expect(html).toContain(`<figcaption`);
      expect(html).toContain(pick(flow.caption, locale));
      for (const step of flow.steps) {
        expect(html).toContain(pick(step.title, locale));
        expect(html).toContain(pick(step.detail, locale));
      }
      expect(html.match(/<li\b/g)).toHaveLength(flow.steps.length);
      expect(html.match(/<svg\b[^>]*aria-hidden="true"/g)).toHaveLength(flow.steps.length * 2 - 1);
    }
  });

  it('renders comparisons with a caption and scoped row and column headers', () => {
    const table = blogPosts.flatMap(post => post.sections).find(section => section.table)!.table!;
    for (const locale of ['en', 'ja'] as const) {
      const html = renderToStaticMarkup(createElement(BlogComparison, { table, locale }));
      expect(html).toContain(pick(table.caption, locale));
      expect(html.match(/scope="col"/g)).toHaveLength(table.headers.length);
      expect(html.match(/scope="row"/g)).toHaveLength(table.rows.length);
      for (const cell of [...table.headers, ...table.rows.flat()]) expect(html).toContain(pick(cell, locale));
    }
  });
});
