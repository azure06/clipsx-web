'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { listBrowserDeviceRecords, saveBrowserDeviceRecord, type BrowserDeviceRecord } from '@/lib/vault/browser-device-store';
import { createBrowserVaultIdentity, encodeBrowserDeviceBundle, wrapDeviceBundle, type BrowserVaultIdentity } from '@/lib/vault/browser-onboarding';
import { createInitialDeviceRegistrationCommand, decodeDeviceRegistrationChallenge } from '@/lib/vault/browser-registration';
import { BrowserVaultRuntime } from '@/lib/vault/browser-vault-runtime';
import { deriveVaultPassphraseKey, encodeCanonicalCbor, randomBytes } from '@/lib/vault/protocol';
import { createVaultPrfCredential, getVaultPrfOutput } from '@/lib/vault/webauthn-prf';

type Profile = 'webauthn-prf-wrapped' | 'vault-passphrase-wrapped';

function body(bytes: Uint8Array): ArrayBuffer { return bytes.slice().buffer as ArrayBuffer; }

export function VaultOnboardingClient({ accountId }: { accountId: string }) {
  const deviceId = useMemo(() => crypto.randomUUID(), []);
  const recoveryKeyId = useMemo(() => crypto.randomUUID(), []);
  const [identity, setIdentity] = useState<BrowserVaultIdentity | null>(null);
  const [existingRecord, setExistingRecord] = useState<BrowserDeviceRecord | null | undefined>(undefined);
  const [checks, setChecks] = useState<Record<number, string>>({});
  const [profile, setProfile] = useState<Profile>('webauthn-prf-wrapped');
  const [passphrase, setPassphrase] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  useEffect(() => { void listBrowserDeviceRecords(accountId).then((records) => setExistingRecord(records[0] ?? null)); }, [accountId]);
  useEffect(() => {
    if (existingRecord === null) void createBrowserVaultIdentity(accountId, deviceId).then(setIdentity);
  }, [accountId, deviceId, existingRecord]);

  const positions = [2, 11, 20];

  async function enroll() {
    setWorking(true);
    setError(null);
    try {
      if (!identity) throw new Error('Vault keys are still being prepared.');
      const resolvedIdentity = identity;
      const words = resolvedIdentity.recoveryPhrase.split(' ');
      if (positions.some((position) => checks[position]?.trim().toLowerCase() !== words[position])) {
        throw new Error('The recovery-word confirmation does not match.');
      }
      if (profile === 'vault-passphrase-wrapped' && passphrase.length < 12) {
        throw new Error('Use a vault passphrase of at least 12 characters.');
      }

      let unlockMaterial: Uint8Array;
      let passphraseKdfSalt: Uint8Array | undefined;
      let webauthnCredentialId: Uint8Array | undefined;
      let prfInput: Uint8Array | undefined;
      if (profile === 'webauthn-prf-wrapped') {
        const credential = await createVaultPrfCredential(accountId);
        unlockMaterial = await getVaultPrfOutput(credential);
        webauthnCredentialId = credential.credentialId;
        prfInput = credential.prfInput;
      } else {
        passphraseKdfSalt = randomBytes(16);
        unlockMaterial = await deriveVaultPassphraseKey(passphrase, passphraseKdfSalt);
      }
      const devicePublicKey = resolvedIdentity.deviceEncryption.publicKey;
      const challengeRequest = encodeCanonicalCbor(new Map<number, number | Uint8Array>([[1, 1], [2, devicePublicKey]]));
      const challengeResponse = await fetch('/api/vault/device-challenges', {
        method: 'POST', headers: { 'Content-Type': 'application/cbor' }, body: body(challengeRequest),
      });
      if (!challengeResponse.ok) throw new Error('Could not start device registration.');
      const challenge = decodeDeviceRegistrationChallenge(new Uint8Array(await challengeResponse.arrayBuffer()));

      const capabilities = encodeCanonicalCbor(new Map<number, number | string>([[1, 1], [2, 'browser']]));
      const command = await createInitialDeviceRegistrationCommand({
        accountId, deviceId, recoveryKeyId, displayName: 'This browser', platform: navigator.platform || 'browser',
        protectionProfile: profile, capabilities, challenge, identity: resolvedIdentity,
      });
      const registrationResponse = await fetch('/api/vault/commands', {
        method: 'POST', headers: { 'Content-Type': 'application/cbor' }, body: body(command),
      });
      if (!registrationResponse.ok) throw new Error('Device registration was rejected.');

      const encrypted = await wrapDeviceBundle(unlockMaterial, accountId, deviceId, encodeBrowserDeviceBundle(resolvedIdentity));
      const now = new Date().toISOString();
      await saveBrowserDeviceRecord({
        accountId, deviceId, schemaVersion: 1, protectionProfile: profile,
        encryptedBundle: encrypted.encrypted.ciphertext, bundleNonce: encrypted.encrypted.nonce, bundleSalt: encrypted.salt,
        passphraseKdfSalt, webauthnCredentialId, webauthnRpId: profile === 'webauthn-prf-wrapped' ? 'clipsx.app' : undefined,
        prfInput, createdAt: now, updatedAt: now,
      });
      setComplete(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Vault setup failed.');
    } finally {
      setWorking(false);
    }
  }

  const phrase = identity?.recoveryPhrase;
  if (existingRecord === undefined) return <div className="px-4 py-24 sm:px-6"><div className="mx-auto max-w-2xl text-sm text-gray-600 dark:text-gray-300">Checking this browser’s vault device…</div></div>;
  if (existingRecord) return <VaultUnlock accountId={accountId} record={existingRecord} />;
  return (
    <div className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-8">
        <div><p className="text-sm font-semibold text-cyan-600">Encrypted vault</p><h1 className="mt-2 font-heading text-3xl font-black">Create your vault</h1><p className="mt-3 text-gray-600 dark:text-gray-300">Your account signs in; this separate setup creates the keys that decrypt your vault.</p></div>
        {complete ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-6"><h2 className="font-heading text-xl font-bold">Vault device registered</h2><p className="mt-2 text-sm">This browser now has an encrypted local device bundle. Unlock and notes are the next screen.</p></div> : <>
          <section className="rounded-xl border border-amber-400/50 bg-amber-50 p-6 dark:bg-amber-500/10"><h2 className="font-heading text-xl font-bold">Save your 24-word recovery phrase</h2><p className="mt-2 text-sm text-gray-700 dark:text-gray-200">Write it down offline. It is your only guaranteed recovery path and is never stored in this browser bundle or sent to the server.</p><div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-white p-4 font-mono text-sm dark:bg-gray-900 sm:grid-cols-3">{phrase?.split(' ').map((word, index) => <span key={word}>{index + 1}. {word}</span>)}</div></section>
          <section className="rounded-xl border border-gray-200 p-6 dark:border-white/10"><h2 className="font-heading text-xl font-bold">Confirm your phrase</h2><div className="mt-4 grid gap-3 sm:grid-cols-3">{positions.map((position) => <label key={position} className="text-sm">Word {position + 1}<input value={checks[position] ?? ''} onChange={(event) => setChecks((current) => ({ ...current, [position]: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5" autoComplete="off" /></label>)}</div></section>
          <section className="rounded-xl border border-gray-200 p-6 dark:border-white/10"><h2 className="font-heading text-xl font-bold">Protect this browser</h2><label className="mt-4 flex gap-3"><input type="radio" checked={profile === 'webauthn-prf-wrapped'} onChange={() => setProfile('webauthn-prf-wrapped')} /><span><b>Passkey (recommended)</b><br /><span className="text-sm text-gray-600 dark:text-gray-300">User-verified passkey protects the local bundle.</span></span></label><label className="mt-4 flex gap-3"><input type="radio" checked={profile === 'vault-passphrase-wrapped'} onChange={() => setProfile('vault-passphrase-wrapped')} /><span><b>Vault passphrase</b><br /><span className="text-sm text-gray-600 dark:text-gray-300">Use when this browser cannot create a PRF passkey.</span></span></label>{profile === 'vault-passphrase-wrapped' && <input type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5" placeholder="At least 12 characters" autoComplete="new-password" />}</section>
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button loading={working} onClick={enroll}>Create encrypted vault</Button>
        </>}
      </div>
    </div>
  );
}

function VaultUnlock({ accountId, record }: { accountId: string; record: BrowserDeviceRecord }) {
  const [passphrase, setPassphrase] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const runtimeRef = useRef<BrowserVaultRuntime | null>(null);

  useEffect(() => {
    const runtime = new BrowserVaultRuntime(accountId);
    runtimeRef.current = runtime;
    const lockOnPageExit = () => { void runtime.lock(); };
    window.addEventListener('pagehide', lockOnPageExit);
    return () => {
      window.removeEventListener('pagehide', lockOnPageExit);
      runtime.dispose();
      runtimeRef.current = null;
    };
  }, [accountId]);

  async function unlock() {
    setWorking(true);
    setError(null);
    let material: Uint8Array | null = null;
    try {
      if (record.protectionProfile === 'webauthn-prf-wrapped') {
        if (!record.webauthnCredentialId || !record.prfInput || !record.webauthnRpId) throw new Error('This browser’s passkey metadata is incomplete.');
        material = await getVaultPrfOutput({ credentialId: record.webauthnCredentialId, prfInput: record.prfInput, rpId: record.webauthnRpId });
      } else {
        if (!record.passphraseKdfSalt) throw new Error('This browser’s passphrase metadata is incomplete.');
        material = await deriveVaultPassphraseKey(passphrase, record.passphraseKdfSalt);
        setPassphrase('');
      }
      if (!runtimeRef.current) throw new Error('Vault runtime is not ready.');
      await runtimeRef.current.unlock(record, material);
      setUnlocked(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Vault unlock failed.');
    } finally {
      material?.fill(0);
      setWorking(false);
    }
  }

  async function lock() {
    setWorking(true);
    try {
      await runtimeRef.current?.lock();
    } finally {
      setUnlocked(false);
      setWorking(false);
    }
  }

  if (unlocked) return <div className="px-4 py-24 sm:px-6"><div className="mx-auto max-w-2xl rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-6"><p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Vault unlocked</p><h1 className="mt-2 font-heading text-3xl font-black">This browser is ready</h1><p className="mt-3 text-sm text-gray-700 dark:text-gray-200">Its device keys stay in a dedicated vault worker and are released when you lock this vault.</p><Button className="mt-6" variant="outline" loading={working} onClick={lock}>Lock vault</Button></div></div>;
  return <div className="px-4 py-24 sm:px-6"><div className="mx-auto max-w-xl rounded-xl border border-gray-200 p-6 dark:border-white/10"><p className="text-sm font-semibold text-cyan-600">Encrypted vault</p><h1 className="mt-2 font-heading text-3xl font-black">Unlock your vault</h1><p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{record.protectionProfile === 'webauthn-prf-wrapped' ? 'Confirm with the dedicated vault passkey on this browser.' : 'Enter this browser’s vault passphrase.'}</p>{record.protectionProfile === 'vault-passphrase-wrapped' && <input type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} className="mt-5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5" autoComplete="current-password" />}{error && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}<Button className="mt-6" loading={working} onClick={unlock}>Unlock vault</Button></div></div>;
}
