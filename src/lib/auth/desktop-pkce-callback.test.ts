import { describe, expect, it } from 'vitest';

import {
  DESKTOP_AUTH_CALLBACK_URL,
  createDesktopPkceCallbackUrl,
} from './desktop-pkce-callback';

describe('desktop PKCE callback URL', () => {
  it('preserves the PKCE code and state on the fixed ClipsX deep link', () => {
    const result = new URL(createDesktopPkceCallbackUrl(new URLSearchParams({
      code: 'one-time-code',
      state: 'desktop-state',
    })));

    expect(`${result.protocol}//${result.host}${result.pathname}`).toBe(DESKTOP_AUTH_CALLBACK_URL);
    expect(result.searchParams.get('code')).toBe('one-time-code');
    expect(result.searchParams.get('state')).toBe('desktop-state');
  });

  it('forwards allowed OAuth errors without accepting an arbitrary destination', () => {
    const result = new URL(createDesktopPkceCallbackUrl(new URLSearchParams({
      error: 'access_denied',
      error_code: 'provider_cancelled',
      error_description: 'The user cancelled sign-in',
      next: 'https://attacker.example/steal',
      redirect_to: 'https://attacker.example/steal',
    })));

    expect(`${result.protocol}//${result.host}${result.pathname}`).toBe(DESKTOP_AUTH_CALLBACK_URL);
    expect(result.searchParams.get('error')).toBe('access_denied');
    expect(result.searchParams.get('error_code')).toBe('provider_cancelled');
    expect(result.searchParams.get('error_description')).toBe('The user cancelled sign-in');
    expect(result.searchParams.has('next')).toBe(false);
    expect(result.searchParams.has('redirect_to')).toBe(false);
  });
});
