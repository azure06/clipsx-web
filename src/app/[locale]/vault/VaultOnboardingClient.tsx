'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { listBrowserDeviceRecords, saveBrowserDeviceRecord, type BrowserDeviceRecord } from '@/lib/vault/browser-device-store';
import { createBrowserVaultIdentity, encodeBrowserDeviceBundle, wrapDeviceBundle, type BrowserVaultIdentity } from '@/lib/vault/browser-onboarding';
import { createInitialDeviceRegistrationCommand, decodeDeviceRegistrationChallenge } from '@/lib/vault/browser-registration';
import { BrowserVaultRuntime } from '@/lib/vault/browser-vault-runtime';
import { beginNoteConflict, isStaleNoteUpdate, keepRemoteResolution, manualMergeResolution, reapplyLocalResolution, type NoteConflict, type VaultItemContent, type VaultItemHead } from '@/lib/vault/browser-note-conflict';
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
  const [collections, setCollections] = useState<Array<{ id: string; title: string }>>([]);
  const [collectionTitle, setCollectionTitle] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [itemType, setItemType] = useState<'note' | 'login'>('note');
  const [itemTitle, setItemTitle] = useState('');
  const [itemBody, setItemBody] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [items, setItems] = useState<VaultItemHead[]>([]);
  const [editing, setEditing] = useState<VaultItemHead | null>(null);
  const [draft, setDraft] = useState<VaultItemContent | null>(null);
  const [conflict, setConflict] = useState<NoteConflict | null>(null);
  const [mergeDraft, setMergeDraft] = useState<VaultItemContent | null>(null);
  const runtimeRef = useRef<BrowserVaultRuntime | null>(null);

  function clearPlaintext() {
    setItems([]); setEditing(null); setDraft(null); setConflict(null); setMergeDraft(null);
    setItemTitle(''); setItemBody(''); setUsername(''); setPassword(''); setUrl('');
  }

  useEffect(() => {
    const runtime = new BrowserVaultRuntime(accountId);
    runtimeRef.current = runtime;
    runtime.onLock = clearPlaintext;
    const lockOnPageExit = () => { clearPlaintext(); void runtime.lock(); };
    window.addEventListener('pagehide', lockOnPageExit);
    return () => {
      window.removeEventListener('pagehide', lockOnPageExit);
      clearPlaintext();
      runtime.onLock = null;
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
      await refreshCollections();
      setUnlocked(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Vault unlock failed.');
    } finally {
      material?.fill(0);
      setWorking(false);
    }
  }

  async function refreshCollections() {
    if (!runtimeRef.current) throw new Error('Vault runtime is not ready.');
    const bootstrapResponse = await fetch('/api/vault/bootstrap', { cache: 'no-store' });
    if (!bootstrapResponse.ok) throw new Error('Could not load encrypted vault records.');
    const opened = await runtimeRef.current.openBootstrap(new Uint8Array(await bootstrapResponse.arrayBuffer()));
    setCollections(opened);
    setSelectedCollectionId((current) => opened.some((collection) => collection.id === current) ? current : (opened[0]?.id ?? ''));
  }

  async function createCollection() {
    const title = collectionTitle.trim();
    if (!title) { setError('Enter a collection name.'); return; }
    setWorking(true);
    setError(null);
    try {
      if (!runtimeRef.current) throw new Error('Vault runtime is not ready.');
      const created = await runtimeRef.current.createCollection({ deviceId: record.deviceId, metadataTitle: title });
      const response = await fetch('/api/vault/commands', { method: 'POST', headers: { 'Content-Type': 'application/cbor' }, body: body(created.command) });
      if (!response.ok) throw new Error('Could not create the encrypted collection.');
      setCollectionTitle('');
      await refreshCollections();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the encrypted collection.');
    } finally {
      setWorking(false);
    }
  }

  async function lock() {
    setWorking(true);
    try {
      await runtimeRef.current?.lock();
    } finally {
      setUnlocked(false);
      setCollections([]);
      clearPlaintext();
      setWorking(false);
    }
  }

  async function refreshItems(collectionId = selectedCollectionId): Promise<VaultItemHead[]> {
    if (!runtimeRef.current || !collectionId) return [];
    const response = await fetch(`/api/vault/collections/${collectionId}/sync`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not sync encrypted items.');
    const opened = await runtimeRef.current.openCollectionSync({ deviceId: record.deviceId, collectionId, sync: new Uint8Array(await response.arrayBuffer()) });
    setItems(opened);
    return opened;
  }

  function itemContent(item: VaultItemContent): VaultItemContent {
    return { type: item.type, title: item.title, body: item.body, username: item.username, password: item.password, url: item.url, labels: [...item.labels] };
  }

  async function submitUpdate(remote: VaultItemHead, local: VaultItemContent) {
    if (!runtimeRef.current || !selectedCollectionId) throw new Error('Vault runtime is not ready.');
    const created = await runtimeRef.current.updateNote({
      deviceId: record.deviceId, collectionId: selectedCollectionId, noteId: remote.id,
      revisionNumber: remote.revisionNumber + 1, previousRevisionHash: remote.revisionHash, content: local,
    });
    const response = await fetch('/api/vault/commands', { method: 'POST', headers: { 'Content-Type': 'application/cbor' }, body: body(created.command) });
    if (isStaleNoteUpdate(response.status)) {
      await refreshCollections();
      const refreshed = await refreshItems(selectedCollectionId);
      const accepted = refreshed.find((item) => item.id === remote.id);
      if (!accepted) throw new Error('The conflicting remote item was not returned by verified sync.');
      setEditing(null); setDraft(null); setMergeDraft(null);
      setConflict(beginNoteConflict(local, accepted));
      return;
    }
    if (!response.ok) throw new Error('Could not update the encrypted item.');
    setEditing(null); setDraft(null); setConflict(null); setMergeDraft(null);
    await refreshCollections();
    await refreshItems(selectedCollectionId);
  }

  async function saveEdit() {
    if (!editing || !draft) return;
    setWorking(true); setError(null);
    try { await submitUpdate(editing, draft); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not update the encrypted item.'); }
    finally { setWorking(false); }
  }

  async function reapplyConflict() {
    if (!conflict) return;
    setWorking(true); setError(null);
    try { await submitUpdate(conflict.remote, reapplyLocalResolution(conflict)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not reapply the encrypted draft.'); }
    finally { setWorking(false); }
  }

  async function saveManualMerge() {
    if (!conflict || !mergeDraft) return;
    setWorking(true); setError(null);
    try { await submitUpdate(conflict.remote, manualMergeResolution(conflict, mergeDraft)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save the merged encrypted item.'); }
    finally { setWorking(false); }
  }

  async function deleteItem(item: VaultItemHead) {
    if (!runtimeRef.current || !selectedCollectionId || !window.confirm('Delete this encrypted item? This removes its server ciphertext and cannot be undone.')) return;
    setWorking(true); setError(null);
    try {
      const deleted = await runtimeRef.current.deleteNote({ deviceId: record.deviceId, collectionId: selectedCollectionId, noteId: item.id, previousRevisionHash: item.revisionHash });
      const response = await fetch('/api/vault/commands', { method: 'POST', headers: { 'Content-Type': 'application/cbor' }, body: body(deleted.command) });
      if (!response.ok) throw new Error(response.status === 409 ? 'The item changed before it could be deleted. Refresh and try again.' : 'Could not delete the encrypted item.');
      setEditing(null); setDraft(null); setConflict(null); setMergeDraft(null);
      await refreshCollections();
      await refreshItems(selectedCollectionId);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not delete the encrypted item.'); }
    finally { setWorking(false); }
  }

  async function createItem() {
    if (!selectedCollectionId || !itemTitle.trim()) { setError('Choose a collection and enter a title.'); return; }
    if (itemType === 'login' && (!username || !password)) { setError('A login needs a username and password.'); return; }
    setWorking(true); setError(null);
    try {
      if (!runtimeRef.current) throw new Error('Vault runtime is not ready.');
      const created = await runtimeRef.current.createNote({
        deviceId: record.deviceId, collectionId: selectedCollectionId,
        content: itemType === 'note' ? { type: 'note', title: itemTitle.trim(), body: itemBody, labels: [] }
          : { type: 'login', title: itemTitle.trim(), username, password, url, labels: [] },
      });
      const response = await fetch('/api/vault/commands', { method: 'POST', headers: { 'Content-Type': 'application/cbor' }, body: body(created.command) });
      if (!response.ok) throw new Error('Could not save the encrypted item.');
      setItemTitle(''); setItemBody(''); setUsername(''); setPassword(''); setUrl('');
      await refreshCollections();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the encrypted item.');
    } finally { setWorking(false); }
  }

  if (unlocked) return <div className="px-4 py-24 sm:px-6"><div className="mx-auto max-w-2xl rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-6"><p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Vault unlocked</p><h1 className="mt-2 font-heading text-3xl font-black">Your collections</h1><p className="mt-3 text-sm text-gray-700 dark:text-gray-200">Collection names and saved-item plaintext are decrypted and encrypted only inside the vault worker.</p><div className="mt-5 flex gap-2"><input value={collectionTitle} onChange={(event) => setCollectionTitle(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5" placeholder="Collection name" maxLength={128} /><Button loading={working} onClick={createCollection}>Create collection</Button></div><section className="mt-5 space-y-3 rounded-lg border border-emerald-500/30 bg-white/50 p-4 dark:bg-gray-900/50"><h2 className="font-semibold">Save encrypted item</h2><div className="grid gap-3 sm:grid-cols-2"><select value={selectedCollectionId} onChange={(event) => { setSelectedCollectionId(event.target.value); clearPlaintext(); }} className="rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5"><option value="">Choose collection</option>{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.title}</option>)}</select><select value={itemType} onChange={(event) => setItemType(event.target.value as 'note' | 'login')} className="rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5"><option value="note">Note</option><option value="login">Login</option></select></div><input value={itemTitle} onChange={(event) => setItemTitle(event.target.value)} placeholder="Title" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5" />{itemType === 'note' ? <textarea value={itemBody} onChange={(event) => setItemBody(event.target.value)} placeholder="Note" className="min-h-24 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5" /> : <><input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" autoComplete="off" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5" /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" autoComplete="new-password" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5" /><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="URL (optional)" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5" /></>}<Button loading={working} onClick={createItem}>Save encrypted {itemType}</Button></section><Button className="mt-5" variant="outline" onClick={() => void refreshItems().catch((caught) => setError(caught instanceof Error ? caught.message : 'Could not sync encrypted items.'))}>Refresh encrypted items</Button><ul className="mt-3 space-y-2">{items.map((item) => <li key={item.id} className="rounded-lg border border-emerald-500/30 bg-white/50 p-3 dark:bg-gray-900/50"><div className="flex items-center justify-between gap-3"><b>{item.title}</b><div className="flex gap-2"><Button variant="outline" onClick={() => { setEditing(item); setDraft(itemContent(item)); setConflict(null); }}>Edit</Button><Button variant="outline" loading={working} onClick={() => void deleteItem(item)}>Delete</Button></div></div><p className="mt-1 whitespace-pre-wrap text-sm">{item.type === 'note' ? item.body : `${item.username} · ${item.password}`}</p></li>)}</ul>{editing && draft && <section className="mt-5 space-y-3 rounded-lg border border-cyan-500/40 bg-white/50 p-4 dark:bg-gray-900/50"><h2 className="font-semibold">Edit encrypted item</h2><VaultItemEditor value={draft} onChange={setDraft} /><div className="flex gap-2"><Button loading={working} onClick={saveEdit}>Save new revision</Button><Button variant="outline" onClick={() => { setEditing(null); setDraft(null); }}>Cancel</Button></div></section>}{conflict && <section className="mt-5 space-y-3 rounded-lg border border-amber-500/50 bg-amber-50 p-4 dark:bg-amber-500/10"><h2 className="font-semibold">Update conflict</h2><p className="text-sm">A verified remote revision was accepted first. Your draft is held only in this page’s memory and will be lost if you lock, leave, or close this page.</p><div className="rounded border border-amber-500/30 p-3 text-sm"><b>Verified remote: {conflict.remote.title}</b><p className="whitespace-pre-wrap">{conflict.remote.type === 'note' ? conflict.remote.body : `${conflict.remote.username} · ${conflict.remote.password}`}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => { keepRemoteResolution(); setConflict(null); setMergeDraft(null); }}>Keep remote</Button><Button loading={working} onClick={reapplyConflict}>Reapply local</Button><Button variant="outline" onClick={() => setMergeDraft(itemContent(conflict.local))}>Manual merge</Button></div>{mergeDraft && <div className="space-y-3 rounded border border-amber-500/30 p-3"><p className="text-sm">Edit the merged fields, then save a fresh revision from the verified remote head.</p><VaultItemEditor value={mergeDraft} onChange={setMergeDraft} /><Button loading={working} onClick={saveManualMerge}>Save merged revision</Button></div>}</section>}{error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}<ul className="mt-5 space-y-2">{collections.length === 0 ? <li className="text-sm text-gray-600 dark:text-gray-300">No encrypted collections yet.</li> : collections.map((collection) => <li key={collection.id} className="rounded-lg border border-emerald-500/30 bg-white/50 px-4 py-3 font-medium dark:bg-gray-900/50">{collection.title}</li>)}</ul><Button className="mt-6" variant="outline" loading={working} onClick={lock}>Lock vault</Button></div></div>;
  return <div className="px-4 py-24 sm:px-6"><div className="mx-auto max-w-xl rounded-xl border border-gray-200 p-6 dark:border-white/10"><p className="text-sm font-semibold text-cyan-600">Encrypted vault</p><h1 className="mt-2 font-heading text-3xl font-black">Unlock your vault</h1><p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{record.protectionProfile === 'webauthn-prf-wrapped' ? 'Confirm with the dedicated vault passkey on this browser.' : 'Enter this browser’s vault passphrase.'}</p>{record.protectionProfile === 'vault-passphrase-wrapped' && <input type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} className="mt-5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5" autoComplete="current-password" />}{error && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}<Button className="mt-6" loading={working} onClick={unlock}>Unlock vault</Button></div></div>;
}

function VaultItemEditor({ value, onChange }: { value: VaultItemContent; onChange: (value: VaultItemContent) => void }) {
  const change = (patch: Partial<VaultItemContent>) => onChange({ ...value, ...patch });
  return <><input value={value.title} onChange={(event) => change({ title: event.target.value })} placeholder="Title" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5" />{value.type === 'note' ? <textarea value={value.body ?? ''} onChange={(event) => change({ body: event.target.value })} placeholder="Note" className="min-h-24 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5" /> : <><input value={value.username ?? ''} onChange={(event) => change({ username: event.target.value })} placeholder="Username" autoComplete="off" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5" /><input type="password" value={value.password ?? ''} onChange={(event) => change({ password: event.target.value })} placeholder="Password" autoComplete="new-password" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5" /><input value={value.url ?? ''} onChange={(event) => change({ url: event.target.value })} placeholder="URL (optional)" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5" /></>}</>;
}
