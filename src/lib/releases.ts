import "server-only";
import { unstable_cache } from 'next/cache';
import {
  parsePublishedRelease,
  type PublishedRelease,
} from "@/config/download";
import { siteConfig } from "@/config/site";

const manifestUrl = `${siteConfig.releases}/latest/download/downloads.json`;
const maxManifestBytes = 64 * 1024;

/** Throws on failure: only verified manifests may replace a successful cache entry. */
export function createReleaseLoader(fetcher: typeof fetch = fetch) {
  return async function load(): Promise<PublishedRelease> {
    const response = await fetcher(manifestUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Release metadata HTTP ${response.status}`);
    if (!response.body) throw new Error('Release manifest is empty');

    // Bound bytes while reading, instead of allocating an unbounded response.
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxManifestBytes) {
          await reader.cancel();
          throw new Error('Release manifest exceeds size limit');
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return parsePublishedRelease(JSON.parse(new TextDecoder().decode(bytes)));
  };
}

const getCachedRelease = unstable_cache(createReleaseLoader(), ['published-release-v1', manifestUrl], {
  revalidate: 30,
});

export async function getPublishedRelease(): Promise<PublishedRelease | null> {
  try {
    return await getCachedRelease();
  } catch (error) {
    // Cold-cache failure exposes no links. Revalidation errors retain the
    // framework's last verified entry instead of caching an unavailable result.
    console.warn('Published release unavailable', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}
