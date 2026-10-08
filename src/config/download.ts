import { siteConfig } from "./site";

// Enable only after the public listing and a supported stable package are verified.
export const snapStore = {
  enabled: false,
  url: "https://snapcraft.io/clipsx",
} as const;

export type ReleasePlatform = "macos" | "windows" | "linux";
export type ReleaseStatus = "available" | "coming-soon";
export interface DownloadTarget {
  id: string;
  platform: ReleasePlatform;
  architecture: string;
  format: string;
  status: ReleaseStatus;
  signed: boolean;
  notarized: boolean;
  url: string | null;
  sha256?: string;
}
export interface PublishedRelease {
  schemaVersion: 1;
  version: string;
  tag: string;
  sourceRevision: string;
  targets: DownloadTarget[];
}
export const unavailableTargets: DownloadTarget[] = [
  {
    id: "windows-x64",
    platform: "windows",
    architecture: "x64",
    format: ".exe",
    status: "coming-soon",
    signed: false,
    notarized: false,
    url: null,
  },
  {
    id: "macos-arm64",
    platform: "macos",
    architecture: "arm64",
    format: ".dmg",
    status: "coming-soon",
    signed: false,
    notarized: false,
    url: null,
  },
  {
    id: "macos-x64",
    platform: "macos",
    architecture: "x64",
    format: ".dmg",
    status: "coming-soon",
    signed: false,
    notarized: false,
    url: null,
  },
  {
    id: "linux-appimage-x64",
    platform: "linux",
    architecture: "x64",
    format: "AppImage",
    status: "coming-soon",
    signed: false,
    notarized: false,
    url: null,
  },
  {
    id: "linux-deb-x64",
    platform: "linux",
    architecture: "x64",
    format: ".deb",
    status: "coming-soon",
    signed: false,
    notarized: false,
    url: null,
  },
];
const suffixes: Record<string, string> = {
  "windows-x64": "windows-x64-setup.exe",
  "macos-arm64": "darwin-aarch64.dmg",
  "macos-x64": "darwin-x86_64.dmg",
  "linux-appimage-x64": "linux-x64.AppImage",
  "linux-deb-x64": "linux-x64.deb",
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function parsePublishedRelease(value: unknown): PublishedRelease {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    typeof value.version !== "string" ||
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value.version) ||
    value.tag !== `v${value.version}` ||
    typeof value.sourceRevision !== "string" ||
    !/^[a-f0-9]{40}$/.test(value.sourceRevision) ||
    !Array.isArray(value.targets) ||
    value.targets.length !== unavailableTargets.length
  ) {
    throw new Error("Invalid published release identity");
  }
  const version = value.version;
  const targets = unavailableTargets.map((expected) => {
    const matches = (value.targets as unknown[]).filter(
      (item) => isRecord(item) && item.id === expected.id,
    );
    const target = matches[0];
    const url = `${siteConfig.releases}/download/v${version}/ClipsX_${version}_${suffixes[expected.id]}`;
    if (
      matches.length !== 1 ||
      !isRecord(target) ||
      target.platform !== expected.platform ||
      target.architecture !== expected.architecture ||
      target.format !== expected.format ||
      target.url !== url ||
      typeof target.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(target.sha256) ||
      typeof target.signed !== "boolean" ||
      typeof target.notarized !== "boolean" ||
      (expected.platform === "windows" && !target.signed) ||
      (expected.platform === "macos" && (!target.signed || !target.notarized))
    ) {
      throw new Error(`Invalid certified target: ${expected.id}`);
    }
    return {
      ...expected,
      status: "available" as const,
      url,
      sha256: target.sha256,
      signed: target.signed,
      notarized: target.notarized,
    };
  });
  return {
    schemaVersion: 1,
    version,
    tag: value.tag as string,
    sourceRevision: value.sourceRevision,
    targets,
  };
}
