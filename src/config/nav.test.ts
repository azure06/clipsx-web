import { describe, expect, it } from 'vitest';
import { footerNav, mainNavLinks, mainNavMenus } from './nav';
import { documentationConfig } from './site';

describe('public navigation', () => {
  it('keeps Docs and Pricing as direct primary destinations', () => {
    expect(mainNavLinks.map((item) => item.href)).toEqual([documentationConfig.root, '/pricing']);
    expect(mainNavLinks[0].external).toBe(true);
  });

  it('groups product and developer destinations without broken internal paths', () => {
    expect(mainNavMenus.map((menu) => menu.id)).toEqual(['product', 'developers']);
    expect(mainNavMenus[0].items.map((item) => item.href)).toContain('/recall');
    expect(mainNavMenus[0].items.map((item) => item.href)).toContain('/meaning-search');
    expect(mainNavMenus[0].items.find((item) => item.href === '/meaning-search')?.external).not.toBe(true);
    expect(mainNavMenus[1].items.find((item) => item.external)?.href).toMatch(/^https:\/\//);
  });

  it('retains secondary destinations in the footer', () => {
    expect(footerNav.company.map((item) => item.href)).toEqual(expect.arrayContaining(['/blog', '/changelog', '/faq']));
  });
});
