import type { Provider } from '@supabase/supabase-js';

export const oauthProviders = ['google', 'github'] as const;
export type ClipsXOauthProvider = (typeof oauthProviders)[number];

export function isClipsXOauthProvider(value: string): value is ClipsXOauthProvider {
  return oauthProviders.includes(value as ClipsXOauthProvider);
}

export function asSupabaseProvider(provider: ClipsXOauthProvider): Provider { return provider; }

export function safeNextPath(value: string | null | undefined, locale: string, fallback = '/account') {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return `/${locale}${fallback}`;
  const localePrefix = `/${locale}`;
  return value === localePrefix || value.startsWith(`${localePrefix}/`) ? value : `${localePrefix}${value}`;
}
