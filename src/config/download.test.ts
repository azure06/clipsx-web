import { describe, expect, it } from "vitest";
import { parsePublishedRelease, unavailableTargets } from "./download";
import { releaseFixture } from "@/test/release-fixture";

describe("published release manifest", () => {
  it("exposes certified URLs and separate Mac architectures", () => {
    const release = parsePublishedRelease(releaseFixture());
    expect(
      release.targets.every((target) => target.status === "available"),
    ).toBe(true);
    expect(
      release.targets
        .filter((target) => target.platform === "macos")
        .map((target) => target.architecture),
    ).toEqual(["arm64", "x64"]);
  });
  it("rejects unsigned Windows, unnotarized Mac, missing and duplicate targets", () => {
    const unsigned = releaseFixture();
    unsigned.targets[0].signed = false;
    const unnotarized = releaseFixture();
    unnotarized.targets[1].notarized = false;
    const incomplete = releaseFixture();
    incomplete.targets.pop();
    const duplicate = releaseFixture();
    duplicate.targets[1] = duplicate.targets[0];
    for (const value of [unsigned, unnotarized, incomplete, duplicate])
      expect(() => parsePublishedRelease(value)).toThrow();
  });
  it("rejects foreign URLs, wrong tags, invalid digests and unknown schemas", () => {
    const foreign = releaseFixture();
    foreign.targets[0].url = "https://example.com/setup.exe";
    const digest = releaseFixture();
    digest.targets[0].sha256 = "bad";
    for (const value of [
      foreign,
      digest,
      { ...releaseFixture(), tag: "v9.0.0" },
      { ...releaseFixture(), schemaVersion: 2 },
    ])
      expect(() => parsePublishedRelease(value)).toThrow();
  });
  it("provides no placeholder URLs before first publication", () => {
    expect(unavailableTargets.every((target) => target.url === null)).toBe(
      true,
    );
  });
});
