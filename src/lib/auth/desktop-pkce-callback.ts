export const DESKTOP_AUTH_CALLBACK_URL = 'clipsx://auth/callback';

const forwardedParameters = [
  'code',
  'state',
  'error',
  'error_code',
  'error_description',
] as const;

/**
 * Creates the fixed desktop deep link from a Supabase PKCE callback.
 * This deliberately forwards only the values the desktop needs to finish or
 * report its own authorization request; it never accepts a caller-supplied
 * destination.
 */
export function createDesktopPkceCallbackUrl(searchParams: URLSearchParams) {
  const callbackUrl = new URL(DESKTOP_AUTH_CALLBACK_URL);

  for (const parameter of forwardedParameters) {
    const value = searchParams.get(parameter);
    if (value !== null) callbackUrl.searchParams.set(parameter, value);
  }

  return callbackUrl.toString();
}
