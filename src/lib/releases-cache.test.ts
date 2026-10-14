import { AsyncLocalStorage } from 'node:async_hooks';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';
import { releaseFixture } from '@/test/release-fixture';

// Exercise the installed Next.js cache implementation, not a reimplementation
// of its stale/error policy. A shared backend stands in for deployment storage.
const require = createRequire(import.meta.url);
Object.assign(globalThis, { AsyncLocalStorage });
const { unstable_cache } = require('next/dist/server/web/spec-extension/unstable-cache.js') as typeof import('next/cache');
const { workAsyncStorage } = require('next/dist/server/app-render/work-async-storage.external.js') as typeof import('next/dist/server/app-render/work-async-storage.external');

describe('persistent release cache policy in Next.js', () => {
  it('shares verified data across loaders and retains it on failed stale refresh', async () => {
    let entry: { kind: 'FETCH'; data: { body: string }; revalidate: number } | undefined;
    let stale = false;
    const backend = {
      generateSimpleCacheKey: async (key: string) => key,
      get: async () => entry ? { value: entry, isStale: stale } : null,
      set: vi.fn(async (_key: string, value: typeof entry) => { entry = value; stale = false; }),
    };
    const fetcher = vi.fn().mockResolvedValue(releaseFixture());
    const firstLoader = unstable_cache(fetcher, ['release-policy-test'], { revalidate: 30 });
    const secondLoader = unstable_cache(fetcher, ['release-policy-test'], { revalidate: 30 });
    async function render(load: typeof firstLoader) {
      const store = { incrementalCache: backend, isDraftMode: false, isStaticGeneration: false,
        pendingRevalidates: {} as Record<string, Promise<unknown>> };
      const result = await workAsyncStorage.run(store as unknown as NonNullable<ReturnType<typeof workAsyncStorage.getStore>>, load);
      await Promise.all(Object.values(store.pendingRevalidates));
      return result;
    }
    expect((await render(firstLoader)).version).toBe('0.1.0');
    expect((await render(secondLoader)).version).toBe('0.1.0');
    expect(fetcher).toHaveBeenCalledOnce();
    expect(entry?.revalidate).toBe(30);

    stale = true;
    fetcher.mockRejectedValueOnce(new Error('invalid manifest'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await render(secondLoader)).version).toBe('0.1.0');
    expect(backend.set).toHaveBeenCalledTimes(1);
    expect(JSON.parse(entry!.data.body).version).toBe('0.1.0');
    log.mockRestore();

    fetcher.mockResolvedValueOnce(releaseFixture('0.2.0'));
    expect((await render(firstLoader)).version).toBe('0.1.0');
    expect((await render(secondLoader)).version).toBe('0.2.0');
  });
});
