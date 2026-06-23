'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { locales } from '@/i18n/config';

const labels: Record<string, string> = { en: 'EN', ja: '日本語' };

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(next: string) {
    router.replace(pathname, { locale: next });
  }

  return (
    <div className="flex items-center gap-1">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => switchLocale(l)}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            l === locale
              ? 'text-cyan-400 bg-cyan-500/10'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          aria-label={`Switch to ${l}`}
        >
          {labels[l]}
        </button>
      ))}
    </div>
  );
}
