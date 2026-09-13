import { describe, expect, it } from 'vitest';
import { downloadTargets, releaseAssetUrl, releaseVersion } from './download';
describe('release manifest',()=>{
  it('builds exact canonical release URLs',()=>{expect(releaseAssetUrl('ClipsX.exe')).toBe(`https://github.com/azure06/clipsx/releases/download/v${releaseVersion}/ClipsX.exe`)});
  it('never gives unavailable targets a dead URL',()=>{expect(downloadTargets.filter(target=>target.status!=='available').every(target=>target.url===null)).toBe(true)});
  it('keeps macOS unavailable until notarized',()=>{expect(downloadTargets.filter(target=>target.platform==='macos').every(target=>target.status!=='available'||target.notarized)).toBe(true)});
});
