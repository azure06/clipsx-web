import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import ChangelogPage, { generateMetadata } from './page';
import { releases } from '@/content/changelog';

vi.mock('next-intl/server', () => ({ setRequestLocale: vi.fn() }));
vi.mock('@/i18n/routing', () => ({ Link: ({ href, children, ...props }: React.ComponentProps<'a'>) => <a href={href} {...props}>{children}</a> }));

describe('published release history', () => {
  it.each(['en', 'ja'] as const)('shows the sourced first release and upgrade limits in %s', async locale => {
    const params = Promise.resolve({ locale });
    const html = renderToStaticMarkup(await ChangelogPage({ params }));
    expect(html).toContain('v0.1.0');
    expect(html).toContain('2026-10-03T02:39:45Z');
    expect(html).toContain('https://github.com/azure06/clipsx/releases/tag/v0.1.0');
    expect(html).toContain('Wayland');
    expect(releases.map(release => release.version)).toEqual(['0.1.3', '0.1.2', '0.1.1', '0.1.0']);
    let previousPosition = -1;
    for (const release of releases) {
      const position = html.indexOf(`id="v${release.version.replaceAll('.', '-')}"`);
      expect(position).toBeGreaterThan(previousPosition);
      previousPosition = position;
      expect(html).toContain(`dateTime="${release.publishedAt}"`);
      expect(html).toContain(release.url);
    }
    expect(releases.every((release, index) => index === 0 || Date.parse(releases[index - 1].publishedAt) >= Date.parse(release.publishedAt))).toBe(true);
    expect(html).not.toContain('candidate-');
    expect(html).not.toContain('<main');
    expect((await generateMetadata({ params })).alternates?.canonical).toContain(`/${locale}/changelog`);
  });
});
