import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parsePublishedRelease } from "@/config/download";
import { releaseFixture } from "@/test/release-fixture";
import { getPublishedRelease } from "@/lib/releases";
import Download from "./page";

const storeState = vi.hoisted(() => ({ enabled: false }));
vi.mock('@/config/download', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/download')>();
  return { ...actual, snapStore: { ...actual.snapStore, get enabled() { return storeState.enabled; } } };
});
afterEach(() => { storeState.enabled = false; });

vi.mock("next-intl/server", () => ({ setRequestLocale: vi.fn() }));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/lib/releases", () => ({ getPublishedRelease: vi.fn() }));
vi.mock("@/components/marketing/Marketing", () => ({ PageIntro: () => null }));
vi.mock('@/i18n/routing', () => ({ Link: ({ href, children, ...props }: React.ComponentProps<'a'>) => <a href={href} {...props}>{children}</a> }));

describe("download page", () => {
  it.each(['en', 'ja'] as const)('shows the localized, theme-aware Snap card only when enabled in %s', async (locale) => {
    vi.mocked(getPublishedRelease).mockResolvedValue(null);
    const params = Promise.resolve({ locale });
    expect(renderToStaticMarkup(await Download({ params }))).not.toContain('https://snapcraft.io/clipsx');
    storeState.enabled = true;
    const html = renderToStaticMarkup(await Download({ params }));
    expect(html).toContain('href="https://snapcraft.io/clipsx"');
    expect(html).toContain('https://snapcraft.io/en/light/install.svg');
    expect(html).toContain('https://snapcraft.io/en/dark/install.svg');
    expect(html).toContain(locale === 'ja' ? 'Snap Store から入手' : 'Get it from the Snap Store');
    expect(html).not.toContain('releases/download/');
  });
  it("shows both Mac architectures and removes the first-release notice", async () => {
    vi.mocked(getPublishedRelease).mockResolvedValue(
      parsePublishedRelease(releaseFixture()),
    );
    const html = renderToStaticMarkup(
      await Download({ params: Promise.resolve({ locale: "en" }) }),
    );
    expect(html).toContain("Apple Silicon");
    expect(html).toContain("Intel / x64");
    expect(html).not.toContain("Downloads temporarily unavailable");
    expect(html).toContain('Copy something');
    expect(html).toContain('Open the setup guide');
    expect(html.match(/releases\/download\/v0.1.0\//g)).toHaveLength(5);
  });
  it("exposes no installer links when published metadata is unavailable", async () => {
    vi.mocked(getPublishedRelease).mockResolvedValue(null);
    const html = renderToStaticMarkup(
      await Download({ params: Promise.resolve({ locale: "en" }) }),
    );
    expect(html).toContain("Downloads temporarily unavailable");
    expect(html).toContain("Downloads unavailable");
    expect(html).not.toContain("releases/download/");
  });
});
