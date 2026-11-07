import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { blogPosts } from '@/content/blog';
import { pick } from '@/content/marketing';
import { BlogComparison, BlogWorkflow } from './BlogVisuals';

describe('article visual explanations', () => {
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
