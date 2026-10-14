import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const auth = vi.hoisted(() => ({
  getClaims: vi.fn(),
  setCookies: undefined as undefined | ((cookies: { name: string; value: string; options?: Record<string, unknown> }[]) => void),
}));
vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: { setAll: typeof auth.setCookies } }) => {
    auth.setCookies = options.cookies.setAll;
    return { auth: { getClaims: auth.getClaims } };
  },
}));

import { updateSession } from './proxy';

describe('private session response', () => {
  beforeEach(() => auth.getClaims.mockReset());

  it('forwards refreshed cookies and retains locale routing headers', async () => {
    const request = new NextRequest('https://clipsx.app/en/account', { headers: { cookie: 'sb-session=old' } });
    const response = NextResponse.rewrite(new URL('/en/account', request.url));
    response.headers.set('x-middleware-override-headers', 'x-next-intl-locale');
    response.headers.set('x-middleware-request-x-next-intl-locale', 'en');
    auth.getClaims.mockImplementation(async () => {
      auth.setCookies?.([{ name: 'sb-session', value: 'fresh', options: { path: '/', httpOnly: true } }]);
    });
    const result = await updateSession(request, response);
    expect(result.headers.get('x-middleware-rewrite')).toBe('https://clipsx.app/en/account');
    expect(result.headers.get('x-middleware-request-x-next-intl-locale')).toBe('en');
    expect(result.headers.get('x-middleware-override-headers')?.split(',')).toEqual(['x-next-intl-locale', 'cookie']);
    expect(result.headers.get('x-middleware-request-cookie')).toContain('sb-session=fresh');
    expect(result.cookies.get('sb-session')?.value).toBe('fresh');
    expect(request.cookies.get('sb-session')?.value).toBe('fresh');
    expect(result.headers.get('cache-control')).toBe('private, no-store');
    expect(auth.getClaims).toHaveBeenCalledOnce();
  });

  it('keeps private responses uncacheable even without refreshed cookies', async () => {
    const result = await updateSession(new NextRequest('https://clipsx.app/ja/vault'), NextResponse.next());
    expect(result.headers.get('cache-control')).toBe('private, no-store');
    expect(result.headers.get('set-cookie')).toBeNull();
  });
});
