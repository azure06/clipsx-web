import { describe, expect, it } from 'vitest';
import { footerNav, mainNavLinks, mainNavMenus } from './nav';

describe('public navigation', () => {
  it('keeps Docs and Pricing as direct primary destinations', () => {
    expect(mainNavLinks.map((item) => item.href)).toEqual(['/docs', '/pricing']);
  });

  it('groups product and developer destinations without broken internal paths', () => {
    expect(mainNavMenus.map((menu) => menu.id)).toEqual(['product', 'developers']);
    expect(mainNavMenus[0].items.map((item) => item.href)).toContain('/recall');
    expect(mainNavMenus[1].items.find((item) => item.external)?.href).toMatch(/^https:\/\//);
  });

  it('retains secondary destinations in the footer', () => {
    expect(footerNav.company.map((item) => item.href)).toEqual(expect.arrayContaining(['/blog', '/changelog', '/faq']));
  });
});
