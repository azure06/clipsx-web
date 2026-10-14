import { locales } from '@/i18n/config';

/** Only these page families need server-side session refresh. APIs verify themselves. */
export function requiresServerSession(pathname: string): boolean {
  const [, locale, section] = pathname.split('/');
  return locales.some(value => value === locale) && (section === 'account' || section === 'vault');
}
