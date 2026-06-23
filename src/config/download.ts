export interface DownloadTarget {
  platform: 'macos' | 'windows' | 'linux';
  titleKey: string;
  reqKey: string;
  url: string;
  ext: string;
}

const VERSION = '0.1.0';

export const downloadTargets: DownloadTarget[] = [
  {
    platform: 'macos',
    titleKey: 'macos_title',
    reqKey: 'macos_req',
    url: `https://github.com/clipsx/clipsx/releases/download/v${VERSION}/ClipsX_${VERSION}_universal.dmg`,
    ext: '.dmg',
  },
  {
    platform: 'windows',
    titleKey: 'windows_title',
    reqKey: 'windows_req',
    url: `https://github.com/clipsx/clipsx/releases/download/v${VERSION}/ClipsX_${VERSION}_x64-setup.exe`,
    ext: '.exe',
  },
  {
    platform: 'linux',
    titleKey: 'linux_title',
    reqKey: 'linux_req',
    url: `https://github.com/clipsx/clipsx/releases/download/v${VERSION}/ClipsX_${VERSION}_amd64.AppImage`,
    ext: '.AppImage',
  },
];
