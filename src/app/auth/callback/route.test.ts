import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const authMocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  exchangeCodeForSession: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: authMocks.createServerClient,
}));

vi.mock('@/i18n/config', () => ({
  defaultLocale: 'en',
  locales: ['en', 'ja'],
}));

import { GET } from './route';

describe('GET /auth/callback', () => {
  beforeEach(() => {
    authMocks.createServerClient.mockReset();
    authMocks.exchangeCodeForSession.mockReset();
    authMocks.createServerClient.mockReturnValue({
      auth: { exchangeCodeForSession: authMocks.exchangeCodeForSession },
    });
    authMocks.exchangeCodeForSession.mockResolvedValue({ error: null });
  });

  it('continues to exchange website callback codes into the browser session', async () => {
    const response = await GET(new NextRequest(
      'https://clipsx.app/auth/callback?code=website-code&next=/ja/account',
    ));

    expect(authMocks.exchangeCodeForSession).toHaveBeenCalledWith('website-code');
    expect(response.headers.get('location')).toBe('https://clipsx.app/ja/account');
  });

  it('rejects a missing website callback code without creating a Supabase client', async () => {
    const response = await GET(new NextRequest('https://clipsx.app/auth/callback'));

    expect(authMocks.createServerClient).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toBe('https://clipsx.app/en/signin?error=auth_callback_failed');
  });
});
