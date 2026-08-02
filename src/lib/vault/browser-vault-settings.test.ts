import { describe, expect, it } from 'vitest';
import { defaultVaultSettings, validateVaultSettings } from './browser-vault-settings';

describe('vault settings', () => {
  it('uses safe security defaults and rejects unsupported timeouts', () => {
    expect(defaultVaultSettings('account').autoLockMinutes).toBe(15);
    expect(defaultVaultSettings('account').clipboardClearSeconds).toBe(60);
    expect(validateVaultSettings({ autoLockMinutes: 3 as never, clipboardClearSeconds: 7 as never }, 'account')).toMatchObject({ autoLockMinutes: 15, clipboardClearSeconds: 60 });
  });
});
