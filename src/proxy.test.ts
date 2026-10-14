import { describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const sdk = vi.hoisted(() => ({ refresh: vi.fn(), route: vi.fn() }));
vi.mock('next-intl/middleware', () => ({ default: () => sdk.route }));
vi.mock('./i18n/routing', () => ({ routing: {} }));
vi.mock('./lib/supabase/proxy', () => ({ updateSession: sdk.refresh }));

import proxy from './proxy';

describe('public requests avoid authentication work', () => {
  it.each(['/en', '/ja/download', '/en/blog', '/en/accountant'])(
    'routes %s without refreshing a session', async path => {
      sdk.refresh.mockClear();
      const response = NextResponse.next();
      sdk.route.mockReturnValue(response);
      expect(await proxy(new NextRequest(`https://clipsx.app${path}`))).toBe(response);
      expect(sdk.refresh).not.toHaveBeenCalled();
      expect(response.headers.get('set-cookie')).toBeNull();
    },
  );
});
