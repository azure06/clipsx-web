import { randomBytes } from './protocol';

export type VaultPrfCredential = { credentialId: Uint8Array; prfInput: Uint8Array; rpId: string };

function browser(): void {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) throw new Error('WebAuthn is unavailable.');
}

function buffer(bytes: Uint8Array): ArrayBuffer { return bytes.slice().buffer; }

/** WebAuthn credentials are scoped by the browser to the current host. */
export function currentVaultRpId(): string {
  browser();
  if (!window.location.hostname) throw new Error('Vault WebAuthn requires a host name.');
  return window.location.hostname;
}

/** Signed enrollment metadata records the exact origin that enrolled the device. */
export function currentVaultEnrollmentOrigin(): string {
  browser();
  if (!window.location.origin || window.location.origin === 'null') throw new Error('Vault enrollment requires a web origin.');
  return window.location.origin;
}

export async function vaultPrfCapability(): Promise<boolean | null> {
  browser();
  const constructor = window.PublicKeyCredential as typeof PublicKeyCredential & {
    getClientCapabilities?: () => Promise<Record<string, boolean>>;
  };
  if (!constructor.getClientCapabilities) return null;
  const capabilities = await constructor.getClientCapabilities();
  return capabilities['extension:prf'] === true;
}

export async function createVaultPrfCredential(accountId: string, rpId = currentVaultRpId()): Promise<VaultPrfCredential> {
  browser();
  const prfInput = randomBytes(32);
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: buffer(randomBytes(32)), rp: { id: rpId, name: 'ClipsX Vault' },
      // The opaque account ID is the required stable user handle. Do not surface
      // it in an authenticator UI as a pretend username.
      user: { id: buffer(new TextEncoder().encode(accountId)), name: 'ClipsX Vault', displayName: 'ClipsX Vault' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      authenticatorSelection: { userVerification: 'required' },
      extensions: { prf: { eval: { first: prfInput } } } as AuthenticationExtensionsClientInputs,
    },
  }) as PublicKeyCredential | null;
  if (!credential) throw new Error('Vault passkey creation was cancelled.');
  const results = credential.getClientExtensionResults() as { prf?: { enabled?: boolean } };
  if (!results.prf?.enabled) throw new Error('This passkey does not support the vault PRF extension.');
  return { credentialId: new Uint8Array(credential.rawId), prfInput, rpId };
}

export async function getVaultPrfOutput(credential: VaultPrfCredential): Promise<Uint8Array> {
  browser();
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: buffer(randomBytes(32)), rpId: credential.rpId, userVerification: 'required',
      allowCredentials: [{ type: 'public-key', id: buffer(credential.credentialId) }],
      extensions: { prf: { eval: { first: credential.prfInput } } } as AuthenticationExtensionsClientInputs,
    },
  }) as PublicKeyCredential | null;
  if (!assertion) throw new Error('Vault passkey confirmation was cancelled.');
  const result = assertion.getClientExtensionResults() as { prf?: { results?: { first?: ArrayBuffer } } };
  const output = result.prf?.results?.first;
  if (!output || output.byteLength !== 32) throw new Error('This passkey cannot provide the vault PRF output.');
  return new Uint8Array(output);
}
