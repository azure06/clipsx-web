import "server-only";
import {
  parsePublishedRelease,
  type PublishedRelease,
} from "@/config/download";
import { siteConfig } from "@/config/site";

export function createReleaseLoader(
  options: { fetcher?: typeof fetch; now?: () => number } = {},
) {
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? Date.now;
  let cached: PublishedRelease | null = null;
  let expiresAt = 0;
  let pending: Promise<PublishedRelease | null> | null = null;
  return async function load(): Promise<PublishedRelease | null> {
    if (now() < expiresAt) return cached;
    if (pending) return pending;
    pending = (async () => {
      try {
        const response = await fetcher(
          `${siteConfig.releases}/latest/download/downloads.json`,
          {
            cache: "no-store",
            signal: AbortSignal.timeout(5_000),
            headers: {
              Accept: "application/json",
              "Cache-Control": "no-cache",
            },
          },
        );
        if (!response.ok)
          throw new Error(`Release metadata HTTP ${response.status}`);
        const body = await response.text();
        if (body.length > 64 * 1024)
          throw new Error("Release manifest exceeds size limit");
        cached = parsePublishedRelease(JSON.parse(body));
      } catch {
        // Retain the last verified release during an outage. Cold instances expose no links.
      } finally {
        expiresAt = now() + 30_000;
      }
      return cached;
    })();
    try {
      return await pending;
    } finally {
      pending = null;
    }
  };
}
export const getPublishedRelease = createReleaseLoader();
