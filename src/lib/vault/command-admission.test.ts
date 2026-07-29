import { describe, expect, it } from 'vitest';

import { configuredVaultEnrollmentOrigins, isAllowedVaultEnrollmentOrigin } from './command-admission';

describe('vault enrollment origin admission', () => {
  it('accepts configured production/staging origins and loopback development origins', () => {
    const configured = configuredVaultEnrollmentOrigins('https://clipsx.app, https://staging.clipsx.app');
    expect(isAllowedVaultEnrollmentOrigin('https://clipsx.app', 'production', configured)).toBe(true);
    expect(isAllowedVaultEnrollmentOrigin('https://staging.clipsx.app', 'production', configured)).toBe(true);
    expect(isAllowedVaultEnrollmentOrigin('http://localhost:3000')).toBe(true);
    expect(isAllowedVaultEnrollmentOrigin('https://127.0.0.1:3000')).toBe(true);
    expect(isAllowedVaultEnrollmentOrigin('http://localhost:3000', 'production', configured)).toBe(false);
    expect(isAllowedVaultEnrollmentOrigin('https://evil.example')).toBe(false);
    expect(isAllowedVaultEnrollmentOrigin('not an origin')).toBe(false);
  });
});
