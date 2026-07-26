import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { GET } from './route';

describe('GET /auth/desktop/callback', () => {
  it('forwards the PKCE result to the fixed desktop link without setting cookies', async () => {
    const response = await GET(new NextRequest(
      'https://clipsx.app/auth/desktop/callback?code=one-time-code&state=desktop-state&next=https://attacker.example',
    ));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toContain('clipsx://auth/callback?code=one-time-code&amp;state=desktop-state');
    expect(body).not.toContain('attacker.example');
    expect(body).not.toContain('exchangeCodeForSession');
  });

  it('forwards OAuth errors to the desktop app', async () => {
    const response = await GET(new NextRequest(
      'https://clipsx.app/auth/desktop/callback?error=access_denied&error_description=The%20user%20cancelled',
    ));
    const body = await response.text();

    expect(body).toContain('Sign-in needs your attention');
    expect(body).toContain('error=access_denied');
    expect(body).toContain('error_description=The+user+cancelled');
  });
});
