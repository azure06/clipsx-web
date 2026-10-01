import { describe, expect, it, vi } from "vitest";
import { releaseFixture } from "@/test/release-fixture";
import { createReleaseLoader } from "./releases";

describe("runtime release metadata", () => {
  it("blocks on expired cache refresh and deduplicates concurrent requests", async () => {
    let clock = 0;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(releaseFixture()))
      .mockResolvedValueOnce(Response.json(releaseFixture("0.2.0")));
    const load = createReleaseLoader({ fetcher, now: () => clock });
    const first = await Promise.all([load(), load()]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(first[0]?.version).toBe("0.1.0");
    clock = 29_999;
    expect((await load())?.version).toBe("0.1.0");
    clock = 30_000;
    expect((await load())?.version).toBe("0.2.0");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
  });
  it("retains the last valid release during upstream or validation failure", async () => {
    let clock = 0;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(releaseFixture()))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(Response.json({ schemaVersion: 99 }));
    const load = createReleaseLoader({ fetcher, now: () => clock });
    await load();
    clock += 30_000;
    expect((await load())?.version).toBe("0.1.0");
    clock += 30_000;
    expect((await load())?.version).toBe("0.1.0");
  });
  it("returns unavailable when no published manifest exists", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("", { status: 404 }));
    expect(await createReleaseLoader({ fetcher })()).toBeNull();
  });
  it("bounds upstream requests with a timeout signal", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async (_url, init) => {
        expect(init?.signal).toBeInstanceOf(AbortSignal);
        expect(init?.signal?.aborted).toBe(false);
        throw new DOMException("Timed out", "TimeoutError");
      });
    expect(await createReleaseLoader({ fetcher })()).toBeNull();
  });
});
