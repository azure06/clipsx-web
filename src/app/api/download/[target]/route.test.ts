import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parsePublishedRelease, unavailableTargets } from '@/config/download';
import { siteConfig } from '@/config/site';
import { getPublishedRelease } from '@/lib/releases';
import { releaseFixture } from '@/test/release-fixture';
import { GET } from './route';

vi.mock('@/lib/releases', () => ({ getPublishedRelease: vi.fn() }));

function download(target: string) {
  return GET(new Request(`https://clipsx.app/api/download/${target}`), {
    params: Promise.resolve({ target }),
  });
}

beforeEach(() => vi.mocked(getPublishedRelease).mockReset());

describe('download redirects', () => {
  it.each(unavailableTargets.map((target) => target.id))('redirects %s to its verified GitHub installer', async (target) => {
    const release = parsePublishedRelease(releaseFixture());
    vi.mocked(getPublishedRelease).mockResolvedValue(release);
    const response = await download(target);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(release.targets.find((item) => item.id === target)?.url);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).toBe('');
    expect(getPublishedRelease).toHaveBeenCalledOnce();
  });

  it('opens GitHub Releases when no verified manifest is available', async () => {
    vi.mocked(getPublishedRelease).mockResolvedValue(null);
    const response = await download('windows-x64');
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(siteConfig.releases);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('rejects unknown targets without checking GitHub', async () => {
    const response = await download('unknown');
    expect(response.status).toBe(404);
    expect(response.headers.get('location')).toBeNull();
    expect(getPublishedRelease).not.toHaveBeenCalled();
  });
});
