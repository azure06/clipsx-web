import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import Developers, { generateMetadata } from './page';
import { documentationConfig, siteConfig } from '@/config/site';

vi.mock('next-intl/server', () => ({ setRequestLocale: vi.fn() }));
vi.mock('@/i18n/routing', () => ({ Link: ({ href, children, ...props }: React.ComponentProps<'a'>) => <a href={href} {...props}>{children}</a> }));

describe('developer onboarding', () => {
  it.each(['en', 'ja'] as const)('provides a first-build destination and contribution paths in %s', async locale => {
    const params = Promise.resolve({ locale });
    const html = renderToStaticMarkup(await Developers({ params }));
    expect(html).toContain(`href="${documentationConfig.rewriteExtension}" class="button-primary`);
    expect(html).toContain('https://github.com/azure06/clipsx-extensions/issues');
    expect(html).toContain(`href="${siteConfig.issues}"`);
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
    expect(html).not.toContain('<main');
    for (const id of ['extension-example', 'first-extension', 'permission-boundary', 'contribute']) {
      expect(html).toContain(`id="${id}"`);
      expect(html).toContain(`aria-labelledby="${id}"`);
    }
    const metadata = await generateMetadata({ params });
    expect(metadata.alternates?.canonical).toContain(`/${locale}/developers`);
    expect(metadata.description).toBeTruthy();
  });
});
