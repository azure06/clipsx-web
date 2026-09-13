import { describe, expect, it } from 'vitest';
import { asSupabaseProvider, isClipsXOauthProvider, safeNextPath } from './oauth';
describe('OAuth admission',()=>{
  it('allows only configured providers',()=>{expect(isClipsXOauthProvider('google')).toBe(true);expect(isClipsXOauthProvider('github')).toBe(true);expect(isClipsXOauthProvider('gitlab')).toBe(false);expect(asSupabaseProvider('github')).toBe('github')});
  it('preserves locale-qualified internal destinations',()=>{expect(safeNextPath('/ja/account','ja')).toBe('/ja/account');expect(safeNextPath('/account','ja')).toBe('/ja/account')});
  it('rejects protocol-relative and backslash destinations',()=>{expect(safeNextPath('//evil.example','en')).toBe('/en/account');expect(safeNextPath('/\\evil','en')).toBe('/en/account')});
});
