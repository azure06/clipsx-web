import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NEXT_HTTP_ERROR_FALLBACK;404'); },
}));
vi.mock('next-intl/server', () => ({ setRequestLocale: vi.fn() }));
vi.mock('@/i18n/routing', () => ({ Link: () => null }));
vi.mock('@/components/marketing/HomePreview', () => ({ HomePreview: () => null }));
vi.mock('@/lib/releases', () => ({ getPublishedRelease: vi.fn() }));

import HomePage, { generateMetadata as homeMetadata } from '@/app/[locale]/page';
import DownloadPage, { generateMetadata as downloadMetadata } from '@/app/[locale]/download/page';
import type { Locale } from './config';

describe('missing assets never render locale content', () => {
  it.each(['favicon.ico', 'logo.svg', 'clips.svg', 'fr', '__proto__'])(
    'rejects %s before content and metadata lookup', async value => {
      const params = Promise.resolve({ locale: value as Locale });
      for (const render of [HomePage, homeMetadata, DownloadPage, downloadMetadata]) {
        await expect(render({ params })).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
      }
    },
  );
});
