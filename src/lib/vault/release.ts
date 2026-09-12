import 'server-only';

import { vaultCborError } from './http';

/** Vault ceremonies are a preview until scoped signer proofs are complete. */
export function vaultPreviewEnabled(): boolean {
  return process.env.CLIPSX_VAULT_PREVIEW_ENABLED === 'true';
}

export function vaultReleaseGuard(): Response | null {
  return vaultPreviewEnabled() ? null : vaultCborError(404, 'vault-not-enabled');
}
