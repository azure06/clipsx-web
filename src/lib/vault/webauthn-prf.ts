import { randomBytes } from './protocol';

export type VaultPrfCredential = { credentialId: Uint8Array; prfInput: Uint8Array; rpId: string };

function browser(): void {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) throw new Error('WebAuthn is unavailable.');
}

function buffer(bytes: Uint8Array): ArrayBuffer { return bytes.slice().buffer; }

export async function createVaultPrfCredential(accountId: string, rpId = 'clipsx.app'): Promise<VaultPrfCredential> {
  browser();
  const prfInput = randomBytes(32);
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: buffer(randomBytes(32)), rp: { id: rpId, name: 'ClipsX Vault' },
      user: { id: buffer(new TextEncoder().encode(accountId)), name: accountId, displayName: 'ClipsX Vault' },
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
