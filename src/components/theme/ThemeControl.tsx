'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme, type ThemePreference } from './ThemeProvider';

const options: Array<{ value: ThemePreference; icon: typeof Sun }> = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
];

export function ThemeControl() {
  const t = useTranslations('Theme');
  const { preference, setPreference } = useTheme();

  return (
    <div className="inline-flex items-center rounded-lg border border-(--ui-border) bg-(--ui-surface-raised) p-0.5" aria-label={t('label')} role="group">
      {options.map(({ value, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setPreference(value)}
          aria-label={t(value)}
          aria-pressed={preference === value}
          title={t(value)}
          className={`focus-ring grid h-8 w-8 place-items-center rounded-md transition-colors ${preference === value ? 'bg-(--ui-accent-subtle) text-(--ui-violet-strong)' : 'text-(--ui-text-muted) hover:bg-(--ui-muted) hover:text-(--ui-text)'}`}
        >
          <Icon size={15} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
