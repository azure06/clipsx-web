import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { MarkdownPreview } from './MarkdownPreview';

describe('MarkdownPreview', () => {
  it('renders GFM while leaving raw HTML inert', () => {
    const html = renderToStaticMarkup(<MarkdownPreview markdown={'# Heading\n\n| Key | Value |\n| --- | --- |\n| one | two |\n\n<div data-testid="raw-html">unsafe</div>'} />);
    expect(html).toContain('Heading');
    expect(html).toContain('<table>');
    expect(html).not.toContain('<div data-testid="raw-html">');
  });

  it('does not render unsafe link protocols as links', () => {
    const html = renderToStaticMarkup(<MarkdownPreview markdown={'[unsafe](javascript:alert(1))'} />);
    expect(html).not.toContain('href=');
    expect(html).toContain('unsafe');
  });
});
