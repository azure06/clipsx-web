import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { unavailableTargets } from "@/config/download";
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
  it.each(['en', 'ja'] as const)("renders download actions without loading release metadata in %s", async (locale) => {
    vi.mocked(getPublishedRelease).mockClear();
    const html = renderToStaticMarkup(
      await Download({ params: Promise.resolve({ locale }) }),
    );
    expect(html).toContain("Apple Silicon");
    expect(html).toContain("Intel / x64");
    expect(html).not.toContain("Downloads temporarily unavailable");
    for (const target of unavailableTargets) {
      expect(html).toContain(`href="/api/download/${target.id}"`);
    }
    expect(html.match(/href="\/api\/download\//g)).toHaveLength(5);
    expect(html).not.toContain("releases/download/");
    expect(getPublishedRelease).not.toHaveBeenCalled();
  });
});
