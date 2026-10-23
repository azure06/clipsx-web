import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HomePreview } from './HomePreview';

describe('desktop-shaped clipboard illustration', () => {
  it.each(['en', 'ja'] as const)('renders searchable sample history and preview actions in %s', locale => {
    const html = renderToStaticMarkup(<HomePreview locale={locale} />);
    expect(html).toContain('cx-sidebar-active');
    expect(html).toContain('cx-app-split');
    expect(html).toContain('cx-preview-actions');
    expect(html).toContain(locale === 'ja' ? 'サンプルをコピー' : 'Copy sample');
    expect(html).toContain(locale === 'ja' ? 'サンプルを検索' : 'Search sample clips');
    expect(html).toContain(locale === 'ja' ? 'クリップボードは読み取りません' : 'your clipboard is never read');
    expect(html).toContain('aria-pressed="true"');
  });
});
