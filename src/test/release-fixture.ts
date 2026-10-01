import { unavailableTargets } from "@/config/download";
export function releaseFixture(version = "0.1.0") {
  const suffixes = [
    "windows-x64-setup.exe",
    "darwin-aarch64.dmg",
    "darwin-x86_64.dmg",
    "linux-x64.AppImage",
    "linux-x64.deb",
  ];
  return {
    schemaVersion: 1,
    version,
    tag: `v${version}`,
    sourceRevision: "a".repeat(40),
    targets: unavailableTargets.map((target, index) => ({
      ...target,
      signed: target.platform !== "linux",
      notarized: target.platform === "macos",
      sha256: "b".repeat(64),
      url: `https://github.com/azure06/clipsx/releases/download/v${version}/ClipsX_${version}_${suffixes[index]}`,
    })),
  };
}
