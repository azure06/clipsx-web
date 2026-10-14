import { describe, expect, it, vi } from 'vitest';
import { releaseFixture } from '@/test/release-fixture';

const cache = vi.hoisted(() => ({ load: vi.fn(), options: undefined as { revalidate: number } | undefined }));
vi.mock('next/cache', () => ({
  unstable_cache: (_load: unknown, _key: unknown, options: { revalidate: number }) => {
    cache.options = options;
    return cache.load;
  },
}));

import { createReleaseLoader, getPublishedRelease } from './releases';

describe('verified release metadata', () => {
  it('fetches and validates installers before admitting a cache entry', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(releaseFixture()));
    expect((await createReleaseLoader(fetcher)()).version).toBe('0.1.0');
    expect(fetcher.mock.calls[0][1]).toMatchObject({ cache: 'no-store', signal: expect.any(AbortSignal) });
    expect(cache.options).toEqual({ revalidate: 30 });
  });

  it.each([
    ['missing', () => new Response('', { status: 404 })],
    ['malformed JSON', () => new Response('{')],
    ['invalid schema', () => Response.json({ schemaVersion: 99 })],
    ['oversized', () => new Response('x'.repeat(64 * 1024 + 1))],
    ['oversized UTF-8', () => new Response('あ'.repeat(24 * 1024))],
  ])('throws for %s so failure cannot overwrite verified cache data', async (_name, response) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response());
    await expect(createReleaseLoader(fetcher)()).rejects.toThrow();
  });

  it('cancels oversized response streams', async () => {
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(64 * 1024 + 1)); },
      cancel,
    }));
    await expect(createReleaseLoader(vi.fn<typeof fetch>().mockResolvedValue(response))()).rejects.toThrow('size limit');
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('propagates network and timeout errors to the cache boundary', async () => {
    for (const error of [new Error('offline'), new DOMException('Timed out', 'TimeoutError')]) {
      await expect(createReleaseLoader(vi.fn<typeof fetch>().mockRejectedValue(error))()).rejects.toThrow();
    }
  });

  it('returns cached verified data and exposes no links on an initial cache failure', async () => {
    cache.load.mockResolvedValueOnce(releaseFixture()).mockRejectedValueOnce(new Error('offline'));
    expect((await getPublishedRelease())?.version).toBe('0.1.0');
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await getPublishedRelease()).toBeNull();
    warning.mockRestore();
  });
});
