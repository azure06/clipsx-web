import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { parsePublishedRelease } from "@/config/download";
import { releaseFixture } from "@/test/release-fixture";
import { getPublishedRelease } from "@/lib/releases";
import Download from "./page";

vi.mock("next-intl/server", () => ({ setRequestLocale: vi.fn() }));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/lib/releases", () => ({ getPublishedRelease: vi.fn() }));
vi.mock("@/components/marketing/Marketing", () => ({ PageIntro: () => null }));

describe("download page", () => {
  it("shows both Mac architectures and removes the first-release notice", async () => {
    vi.mocked(getPublishedRelease).mockResolvedValue(
      parsePublishedRelease(releaseFixture()),
    );
    const html = renderToStaticMarkup(
      await Download({ params: Promise.resolve({ locale: "en" }) }),
    );
    expect(html).toContain("Apple Silicon");
    expect(html).toContain("Intel / x64");
    expect(html).not.toContain("Why no active downloads?");
    expect(html.match(/releases\/download\/v0.1.0\//g)).toHaveLength(5);
  });
  it("exposes no installer links when published metadata is unavailable", async () => {
    vi.mocked(getPublishedRelease).mockResolvedValue(null);
    const html = renderToStaticMarkup(
      await Download({ params: Promise.resolve({ locale: "en" }) }),
    );
    expect(html).toContain("Why no active downloads?");
    expect(html).toContain("Downloads unavailable");
    expect(html).not.toContain("releases/download/");
  });
});
