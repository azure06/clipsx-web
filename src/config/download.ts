import { siteConfig } from './site';

export type ReleasePlatform = 'macos' | 'windows' | 'linux';
export type ReleaseStatus = 'available' | 'coming-soon';

export interface DownloadTarget {
  id: string;
  platform: ReleasePlatform;
  architecture: string;
  format: string;
  status: ReleaseStatus;
  signed: boolean;
  notarized: boolean;
  url: string | null;
}

export const releaseVersion = '0.1.0';
const asset = (name: string) => `${siteConfig.releases}/download/v${releaseVersion}/${name}`;

export const downloadTargets: DownloadTarget[] = [
  {
    id: 'windows-x64', platform: 'windows', architecture: 'x64', format: '.exe',
    status: 'coming-soon', signed: false, notarized: false, url: null,
  },
  {
    id: 'linux-appimage-x64', platform: 'linux', architecture: 'x64', format: 'AppImage',
    status: 'coming-soon', signed: false, notarized: false, url: null,
  },
  {
    id: 'linux-deb-x64', platform: 'linux', architecture: 'x64', format: '.deb',
    status: 'coming-soon', signed: false, notarized: false, url: null,
  },
  { id: 'macos-universal', platform: 'macos', architecture: 'Apple silicon + Intel', format: '.dmg', status: 'coming-soon', signed: false, notarized: false, url: null },
];

export function releaseAssetUrl(fileName: string) { return asset(fileName); }
