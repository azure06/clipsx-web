"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import QRCode from "qrcode";

import { Button } from "@/components/ui/Button";
import {
  forgetBrowserDeviceRecord,
  listBrowserDeviceRecords,
  saveBrowserDeviceRecord,
  type BrowserDeviceRecord,
} from "@/lib/vault/browser-device-store";
import {
  createBrowserDeviceIdentity,
  createBrowserVaultIdentity,
  encodeBrowserDeviceBundle,
  type BrowserVaultIdentity,
} from "@/lib/vault/browser-onboarding";
import { createUnlockSlot, encryptBundle } from "@/lib/vault/browser-unlock-slots";
import { createPendingDeviceRegistrationCommand, decodePendingDeviceOffer } from "@/lib/vault/browser-device-approval";
import {
  createInitialDeviceRegistrationCommand,
  decodeDeviceRegistrationChallenge,
} from "@/lib/vault/browser-registration";
import { BrowserVaultRuntime } from "@/lib/vault/browser-vault-runtime";
import { loadVaultSettings } from "@/lib/vault/browser-vault-settings";
import {
  beginNoteConflict,
  isStaleNoteUpdate,
  keepRemoteResolution,
  manualMergeResolution,
  reapplyLocalResolution,
  type NoteConflict,
  type VaultItemContent,
  type VaultItemHead,
} from "@/lib/vault/browser-note-conflict";
import {
  decryptAesGcm,
  deriveVaultKey,
  deriveVaultPassphraseKey,
  encodeCanonicalCbor,
  encryptAesGcm,
  randomBytes,
  utf8,
} from "@/lib/vault/protocol";
import {
  readVaultCborResponse,
  readVaultCborResponseBytes,
  VaultHttpError,
  vaultErrorMessage,
} from "@/lib/vault/http";
import {
  createVaultPrfCredential,
  currentVaultEnrollmentOrigin,
  getVaultPrfOutput,
  vaultPrfCapability,
} from "@/lib/vault/webauthn-prf";

type Profile = "webauthn-prf-wrapped" | "vault-passphrase-wrapped";

export type VaultCollection = { id: string; title: string };

export type VaultUpdateResult =
  | { kind: "saved"; items: VaultItemHead[] }
  | { kind: "conflict"; conflict: NoteConflict };

type VaultSession = {
  record: BrowserDeviceRecord;
  collections: VaultCollection[];
  working: boolean;
  error: string | null;
  clearError: () => void;
  refreshCollections: () => Promise<void>;
  createCollection: (title: string) => Promise<string>;
  loadItems: (collectionId: string) => Promise<VaultItemHead[]>;
  createItem: (collectionId: string, content: VaultItemContent) => Promise<VaultItemHead[]>;
  updateItem: (collectionId: string, item: VaultItemHead, content: VaultItemContent) => Promise<VaultUpdateResult>;
  deleteItem: (collectionId: string, item: VaultItemHead) => Promise<VaultItemHead[]>;
  reviewDeviceApproval: (offer: string) => Promise<{ command: Uint8Array; sas: string; deviceId: string }>;
  approveDevice: (command: Uint8Array) => Promise<void>;
  lock: () => Promise<void>;
};

const VaultSessionContext = createContext<VaultSession | null>(null);

export function useVaultSession(): VaultSession {
  const session = useContext(VaultSessionContext);
  if (!session) throw new Error("Vault session is unavailable.");
  return session;
}

function body(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function readVaultPages(initialUrl: string, kind: "account" | "collection"): Promise<Uint8Array[]> {
  const pages: Uint8Array[] = [];
  let after = 0;
  let anchor: Uint8Array | null = null;
  for (let pageNumber = 0; pageNumber < 1_000; pageNumber += 1) {
    const separator = initialUrl.includes("?") ? "&" : "?";
    const url = `${initialUrl}${separator}after=${after}${anchor ? `&anchor=${base64Url(anchor)}` : ""}`;
    const response = await fetch(url, { cache: "no-store" });
    const page = await readVaultCborResponseBytes(response, "Could not sync verified vault records.");
    pages.push(page.bytes);
    const next = page.record.get(kind === "account" ? 8 : 7);
    const nextSequence = page.record.get(kind === "account" ? 7 : 5);
    const hasMore = page.record.get(kind === "account" ? 9 : 8);
    if (!Number.isSafeInteger(nextSequence) || (next !== null && !(next instanceof Uint8Array)) || typeof hasMore !== "boolean") {
      throw new Error("Invalid vault sync cursor.");
    }
    after = nextSequence as number;
    anchor = next as Uint8Array | null;
    if (!hasMore) return pages;
    if (!anchor) throw new Error("Vault sync omitted its continuation anchor.");
  }
  throw new Error("Vault sync exceeded the supported page limit.");
}

export function VaultOnboardingClient({ accountId, children }: { accountId: string; children?: ReactNode }) {
  const deviceId = useMemo(() => crypto.randomUUID(), []);
  const recoveryKeyId = useMemo(() => crypto.randomUUID(), []);
  const [identity, setIdentity] = useState<BrowserVaultIdentity | null>(null);
  const [existingRecord, setExistingRecord] = useState<
    BrowserDeviceRecord | null | undefined
  >(undefined);
  const [profile, setProfile] = useState<Profile>("webauthn-prf-wrapped");
  const [passphrase, setPassphrase] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverInspection, setServerInspection] = useState<{
    deviceId: string | null;
    hasVault: boolean;
    deviceStatus: string;
    failed: boolean;
  }>();
  const [prfSupported, setPrfSupported] = useState<boolean | null>(null);

  useEffect(() => {
    void vaultPrfCapability().then((supported) => {
      setPrfSupported(supported);
      if (supported === false) setProfile("vault-passphrase-wrapped");
    }).catch(() => setPrfSupported(false));
  }, []);
  useEffect(() => {
    void listBrowserDeviceRecords(accountId).then((records) =>
      setExistingRecord(records[0] ?? null),
    );
  }, [accountId]);
  useEffect(() => {
    if (existingRecord === undefined) return;
    const inspectedDeviceId = existingRecord?.deviceId ?? null;
    const query = existingRecord
      ? `?deviceId=${encodeURIComponent(existingRecord.deviceId)}`
      : "";
    void fetch(`/api/vault/enrollment-status${query}`, { cache: "no-store" })
      .then(async (response) => {
        const status = await readVaultCborResponse(
          response,
          "Could not inspect vault enrollment.",
        );
        setServerInspection({
          deviceId: inspectedDeviceId,
          hasVault: status.get(2) === true,
          deviceStatus: typeof status.get(3) === "string" ? status.get(3) as string : "unknown",
          failed: false,
        });
      })
      .catch(() => setServerInspection({
        deviceId: inspectedDeviceId,
        hasVault: false,
        deviceStatus: "unknown",
        failed: true,
      }));
  }, [existingRecord]);
  const inspectedDeviceId = existingRecord?.deviceId ?? null;
  const currentInspection = serverInspection?.deviceId === inspectedDeviceId
    ? serverInspection
    : undefined;
  const serverHasVault = currentInspection?.hasVault;
  const serverDeviceStatus = currentInspection?.deviceStatus;
  useEffect(() => {
    if (existingRecord === null && serverHasVault === false)
      void createBrowserVaultIdentity(accountId, deviceId).then(setIdentity);
  }, [accountId, deviceId, existingRecord, serverHasVault]);

  async function enroll() {
    setWorking(true);
    setError(null);
    let unlockMaterial: Uint8Array | null = null;
    let staged = false;
    let accepted = false;
    try {
      if (!identity) throw new Error("Vault keys are still being prepared.");
      const resolvedIdentity = identity;
      const enrollmentOrigin = currentVaultEnrollmentOrigin();
      if (profile === "vault-passphrase-wrapped" && passphrase.length < 12) {
        throw new Error("Use a vault passphrase of at least 12 characters.");
      }

      let passphraseKdfSalt: Uint8Array | undefined;
      let webauthnCredentialId: Uint8Array | undefined;
      let webauthnRpId: string | undefined;
      let prfInput: Uint8Array | undefined;
      if (profile === "webauthn-prf-wrapped") {
        const credential = await createVaultPrfCredential(accountId);
        unlockMaterial = await getVaultPrfOutput(credential);
        webauthnCredentialId = credential.credentialId;
        webauthnRpId = credential.rpId;
        prfInput = credential.prfInput;
      } else {
        passphraseKdfSalt = randomBytes(16);
        unlockMaterial = await deriveVaultPassphraseKey(
          passphrase,
          passphraseKdfSalt,
        );
      }
      if (!unlockMaterial) throw new Error("Vault unlock material is unavailable.");
      const devicePublicKey = resolvedIdentity.deviceEncryption.publicKey;
      const challengeRequest = encodeCanonicalCbor(
        new Map<number, number | Uint8Array>([
          [1, 1],
          [2, devicePublicKey],
        ]),
      );
      const challengeResponse = await fetch("/api/vault/device-challenges", {
        method: "POST",
        headers: { "Content-Type": "application/cbor" },
        body: body(challengeRequest),
      });
      const challengeBytes = await readVaultCborResponseBytes(
        challengeResponse,
        "Could not start device registration",
      );
      const challenge = decodeDeviceRegistrationChallenge(
        challengeBytes.bytes,
      );

      const capabilities = encodeCanonicalCbor(
        new Map<number, number | string>([
          [1, 1],
          [2, "browser"],
        ]),
      );
      const command = await createInitialDeviceRegistrationCommand({
        accountId,
        deviceId,
        recoveryKeyId,
        displayName: "This browser",
        platform: navigator.platform || "browser",
        enrollmentOrigin,
        protectionProfile: profile,
        capabilities,
        challenge,
        identity: resolvedIdentity,
      });
      const encrypted = await encryptBundle(encodeBrowserDeviceBundle(resolvedIdentity), accountId, deviceId);
      const slot = { ...(await createUnlockSlot({ kind: profile === "webauthn-prf-wrapped" ? "passkey" : "passphrase", unlockMaterial, bundleKey: encrypted.bundleKey, accountId, deviceId })), passphraseKdfSalt, webauthnCredentialId, webauthnRpId, prfInput };
      encrypted.bundleKey.fill(0);
      const now = new Date().toISOString();
      const deviceRecord: BrowserDeviceRecord = {
        accountId,
        deviceId,
        schemaVersion: 2,
        protectionProfile: profile,
        enrollmentStatus: "registering",
        encryptedBundle: encrypted.encryptedBundle.ciphertext,
        bundleNonce: encrypted.encryptedBundle.nonce,
        bundleSalt: slot.salt,
        unlockSlots: [slot],
        passphraseKdfSalt,
        webauthnCredentialId,
        webauthnRpId,
        prfInput,
        createdAt: now,
        updatedAt: now,
      };
      await saveBrowserDeviceRecord(deviceRecord);
      staged = true;
      const registrationResponse = await fetch("/api/vault/commands", {
        method: "POST",
        headers: { "Content-Type": "application/cbor" },
        body: body(command),
      });
      await readVaultCborResponse(
        registrationResponse,
        "Device registration was rejected.",
      );
      accepted = true;
      const activeRecord = { ...deviceRecord, enrollmentStatus: "active" as const, updatedAt: new Date().toISOString() };
      await saveBrowserDeviceRecord(activeRecord);
      setExistingRecord(activeRecord);
    } catch (caught) {
      if (staged && !accepted && caught instanceof VaultHttpError
        && caught.category !== "network" && caught.category !== "service") {
        await forgetBrowserDeviceRecord(accountId, deviceId).catch(() => undefined);
      } else if (staged) {
        const records = await listBrowserDeviceRecords(accountId).catch(() => []);
        setExistingRecord(records.find((record) => record.deviceId === deviceId) ?? null);
      }
      setError(vaultErrorMessage(caught, "Vault setup failed."));
    } finally {
      unlockMaterial?.fill(0);
      setPassphrase("");
      setWorking(false);
    }
  }

  const phrase = identity?.recoveryPhrase;
  if (existingRecord === undefined)
    return (
      <div className="px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-2xl text-sm text-gray-600 dark:text-gray-300">
          Checking this browser’s vault device…
        </div>
      </div>
    );
  if (existingRecord?.enrollmentStatus === "pending")
    return <PendingDeviceEnrollment accountId={accountId} record={existingRecord} />;
  if (existingRecord?.enrollmentStatus === "registering")
    return <RegisteringDeviceEnrollment accountId={accountId} record={existingRecord} />;
  if (currentInspection?.failed)
    return <EnrollmentInspectionFailure />;
  if (serverHasVault === undefined)
    return (
      <div className="px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-2xl text-sm text-gray-600 dark:text-gray-300">
          Checking this browser’s vault device…
        </div>
      </div>
    );
  if (existingRecord && serverDeviceStatus !== "active")
    return (
      <StaleDeviceEnrollment
        accountId={accountId}
        record={existingRecord}
        serverHasVault={serverHasVault}
      />
    );
  if (existingRecord)
    return <VaultUnlock accountId={accountId} record={existingRecord}>{children}</VaultUnlock>;
  if (serverHasVault) return <NewDeviceEnrollment accountId={accountId} />;
  return (
    <div className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <p className="text-sm font-semibold text-cyan-600">Encrypted vault</p>
          <h1 className="mt-2 font-heading text-3xl font-black">
            Create your vault
          </h1>
          <p className="mt-3 text-gray-600 dark:text-gray-300">
            Your account signs in; this separate setup creates the keys that
            decrypt your vault.
          </p>
        </div>
        <>
            <section className="rounded-xl border border-amber-400/50 bg-amber-50 p-6 dark:bg-amber-500/10">
              <h2 className="font-heading text-xl font-bold">
                Save your 24-word recovery phrase
              </h2>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                Write it down offline. It is your only guaranteed recovery path
                and is never stored in this browser bundle or sent to the
                server. Store it somewhere safe before continuing. If you lose
                every device and this phrase, the vault cannot be recovered.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-white p-4 font-mono text-sm dark:bg-gray-900 sm:grid-cols-3">
                {phrase?.split(" ").map((word, index) => (
                  <span key={word}>
                    {index + 1}. {word}
                  </span>
                ))}
              </div>
            </section>
            <section className="rounded-xl border border-gray-200 p-6 dark:border-white/10">
              <h2 className="font-heading text-xl font-bold">
                Protect this browser
              </h2>
              <label className="mt-4 flex gap-3">
                <input
                  type="radio"
                  disabled={prfSupported === false}
                  checked={profile === "webauthn-prf-wrapped"}
                  onChange={() => setProfile("webauthn-prf-wrapped")}
                />
                <span>
                  <b>Passkey (recommended)</b>
                  <br />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    User-verified passkey protects the local bundle.
                    {prfSupported === false && " PRF is unavailable in this browser; use a vault passphrase."}
                  </span>
                </span>
              </label>
              <label className="mt-4 flex gap-3">
                <input
                  type="radio"
                  checked={profile === "vault-passphrase-wrapped"}
                  onChange={() => setProfile("vault-passphrase-wrapped")}
                />
                <span>
                  <b>Vault passphrase</b>
                  <br />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Use when this browser cannot create a PRF passkey.
                  </span>
                </span>
              </label>
              {profile === "vault-passphrase-wrapped" && (
                <input
                  type="password"
                  value={passphrase}
                  onChange={(event) => setPassphrase(event.target.value)}
                  className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5"
                  placeholder="At least 12 characters"
                  autoComplete="new-password"
                />
              )}
            </section>
            {error && (
              <p
                role="alert"
                className="text-sm text-red-600 dark:text-red-400"
              >
                {error}
              </p>
            )}
            <Button loading={working} onClick={enroll}>
              Create encrypted vault
            </Button>
        </>
      </div>
    </div>
  );
}

function EnrollmentInspectionFailure() {
  return <div className="px-4 py-24"><div className="mx-auto max-w-xl space-y-4 rounded-xl border p-6">
    <h1 className="font-heading text-3xl font-black">Could not inspect your vault</h1>
    <p className="text-sm">Vault setup is blocked until the server state can be checked. This prevents accidentally creating a second recovery root.</p>
    <Button onClick={() => window.location.reload()}>Try again</Button>
  </div></div>;
}

function StaleDeviceEnrollment({ accountId, record, serverHasVault }: { accountId: string; record: BrowserDeviceRecord; serverHasVault: boolean }) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function removeStaleRecord() {
    setWorking(true);
    setError(null);
    try {
      await forgetBrowserDeviceRecord(accountId, record.deviceId);
      window.location.reload();
    } catch (caught) {
      setError(vaultErrorMessage(caught, "Could not remove the stale browser record."));
      setWorking(false);
    }
  }

  return <div className="px-4 py-24"><div className="mx-auto max-w-xl space-y-4 rounded-xl border p-6">
    <h1 className="font-heading text-3xl font-black">This browser is no longer registered</h1>
    <p className="text-sm">
      {serverHasVault
        ? "The encrypted local keys do not belong to an active server device. Remove this local record, then approve this browser as a new device."
        : "The server vault was reset, but this browser still has its old encrypted device record. Remove it before creating a fresh vault."}
    </p>
    <Button loading={working} onClick={removeStaleRecord}>Remove local device record</Button>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </div></div>;
}

function RegisteringDeviceEnrollment({ accountId, record }: { accountId: string; record: BrowserDeviceRecord }) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reconcile() {
    setWorking(true); setError(null);
    try {
      const response = await fetch(`/api/vault/enrollment-status?deviceId=${encodeURIComponent(record.deviceId)}`, { cache: "no-store" });
      const status = await readVaultCborResponse(response, "Could not check device registration.");
      if (status.get(3) === "active") {
        await saveBrowserDeviceRecord({ ...record, enrollmentStatus: "active", updatedAt: new Date().toISOString() });
      } else {
        await forgetBrowserDeviceRecord(accountId, record.deviceId);
      }
      window.location.reload();
    } catch (caught) {
      setError(vaultErrorMessage(caught, "Could not reconcile device registration."));
    } finally {
      setWorking(false);
    }
  }

  return <div className="px-4 py-24"><div className="mx-auto max-w-xl space-y-4 rounded-xl border p-6">
    <h1 className="font-heading text-3xl font-black">Finish vault registration</h1>
    <p className="text-sm">The encrypted browser bundle was saved, but the last server response was incomplete. Check the authoritative registration state before retrying.</p>
    <Button loading={working} onClick={reconcile}>Check registration</Button>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </div></div>;
}

function NewDeviceEnrollment({ accountId }: { accountId: string }) {
  const deviceId = useMemo(() => crypto.randomUUID(), []);
  const identity = useMemo(() => createBrowserDeviceIdentity(), []);
  const sasSecret = useMemo(() => randomBytes(32), []);
  const [profile, setProfile] = useState<Profile>("webauthn-prf-wrapped");
  const [passphrase, setPassphrase] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [offer, setOffer] = useState("");
  const [sas, setSas] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prfSupported, setPrfSupported] = useState<boolean | null>(null);
  useEffect(() => {
    void vaultPrfCapability().then((supported) => {
      setPrfSupported(supported);
      if (supported === false) setProfile("vault-passphrase-wrapped");
    }).catch(() => setPrfSupported(false));
  }, []);

  async function begin() {
    setWorking(true); setError(null);
    let unlock: Uint8Array | null = null;
    let staged = false;
    let accepted = false;
    try {
      if (profile === "vault-passphrase-wrapped" && passphrase.length < 12) throw new Error("Use a vault passphrase of at least 12 characters.");
      const enrollmentOrigin = currentVaultEnrollmentOrigin();
      let passphraseKdfSalt: Uint8Array | undefined; let webauthnCredentialId: Uint8Array | undefined; let webauthnRpId: string | undefined; let prfInput: Uint8Array | undefined;
      if (profile === "webauthn-prf-wrapped") {
        const credential = await createVaultPrfCredential(accountId); unlock = await getVaultPrfOutput(credential);
        webauthnCredentialId = credential.credentialId; webauthnRpId = credential.rpId; prfInput = credential.prfInput;
      } else { passphraseKdfSalt = randomBytes(16); unlock = await deriveVaultPassphraseKey(passphrase, passphraseKdfSalt); }
      const request = encodeCanonicalCbor(new Map<number, number | Uint8Array>([[1, 1], [2, identity.deviceEncryption.publicKey]]));
      const challengeResponse = await fetch("/api/vault/device-challenges", { method: "POST", headers: { "Content-Type": "application/cbor" }, body: body(request) });
      const challengeBytes = await readVaultCborResponseBytes(challengeResponse, "Could not start pending-device registration");
      const challenge = decodeDeviceRegistrationChallenge(challengeBytes.bytes);
      const pending = await createPendingDeviceRegistrationCommand({
        accountId, deviceId, displayName: "This browser", platform: navigator.platform || "browser", enrollmentOrigin, protectionProfile: profile,
        capabilities: encodeCanonicalCbor(new Map<number, number | string>([[1, 1], [2, "browser"]])), challenge,
        deviceEncryptionPublicKey: identity.deviceEncryption.publicKey, deviceEncryptionSecretKey: identity.deviceEncryption.secretKey,
        deviceSigningPublicKey: identity.deviceSigning.publicKey, deviceSigningSecretKey: identity.deviceSigning.secretKey, sasSecret,
      });
      const wrapped = await encryptBundle(encodeBrowserDeviceBundle(identity), accountId, deviceId);
      const slot = { ...(await createUnlockSlot({ kind: profile === "webauthn-prf-wrapped" ? "passkey" : "passphrase", unlockMaterial: unlock, bundleKey: wrapped.bundleKey, accountId, deviceId })), passphraseKdfSalt, webauthnCredentialId, webauthnRpId, prfInput };
      wrapped.bundleKey.fill(0);
      const offerKey = await deriveVaultKey(unlock, slot.salt, "browserUnlock", utf8(`${accountId}\0${deviceId}\0pending-offer:1`));
      const protectedOffer = await encryptAesGcm(offerKey, utf8(pending.offer), utf8(`clipsx/vault/v1/pending-offer\0${accountId}\0${deviceId}`));
      const now = new Date().toISOString();
      await saveBrowserDeviceRecord({ accountId, deviceId, schemaVersion: 2, protectionProfile: profile, enrollmentStatus: "pending",
        encryptedBundle: wrapped.encryptedBundle.ciphertext, bundleNonce: wrapped.encryptedBundle.nonce, bundleSalt: slot.salt, unlockSlots: [slot],
        pendingOfferCiphertext: protectedOffer.ciphertext, pendingOfferNonce: protectedOffer.nonce,
        passphraseKdfSalt, webauthnCredentialId, webauthnRpId, prfInput, createdAt: now, updatedAt: now });
      staged = true;
      const response = await fetch("/api/vault/commands", { method: "POST", headers: { "Content-Type": "application/cbor" }, body: body(pending.command) });
      await readVaultCborResponse(response, "Pending-device registration was rejected.");
      accepted = true;
      setOffer(pending.offer); setSas(pending.sas); setQr(await QRCode.toDataURL(pending.offer, { width: 320, margin: 2, errorCorrectionLevel: "M" }));
    } catch (caught) {
      if (staged && !accepted && caught instanceof VaultHttpError
        && caught.category !== "network" && caught.category !== "service") {
        await forgetBrowserDeviceRecord(accountId, deviceId).catch(() => undefined);
      }
      setError(vaultErrorMessage(caught, "Could not enroll this browser."));
    }
    finally { unlock?.fill(0); setWorking(false); }
  }
  return <div className="px-4 py-24 sm:px-6"><div className="mx-auto max-w-xl space-y-5 rounded-xl border border-gray-200 p-6 dark:border-white/10"><h1 className="font-heading text-3xl font-black">Approve this browser</h1><p className="text-sm">Protect its new local key bundle first, then scan the QR with an already unlocked device and compare the SAS.</p>
    {!qr && <><label className="flex gap-2"><input type="radio" disabled={prfSupported === false} checked={profile === "webauthn-prf-wrapped"} onChange={() => setProfile("webauthn-prf-wrapped")} />Vault passkey</label>{prfSupported === false && <p className="text-sm text-amber-700">Passkey PRF is unavailable here. Use a vault passphrase.</p>}<label className="flex gap-2"><input type="radio" checked={profile === "vault-passphrase-wrapped"} onChange={() => setProfile("vault-passphrase-wrapped")} />Vault passphrase</label>{profile === "vault-passphrase-wrapped" && <input type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} className="w-full rounded-lg border px-3 py-2" autoComplete="new-password" />}<Button loading={working} onClick={begin}>Create approval QR</Button></>}
    {qr && <div className="space-y-3 text-center"><Image src={qr} width={320} height={320} unoptimized alt="Pending vault device approval QR" className="mx-auto" /><Button onClick={() => void navigator.clipboard.writeText(offer)}>Copy approval offer</Button><p className="text-xs text-gray-600">Use this when both vault devices are desktop browsers.</p><p>SAS</p><p className="font-mono text-3xl font-black tracking-widest">{sas}</p><p className="text-sm">Keep this page open until the existing device confirms approval.</p></div>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}</div></div>;
}

function PendingDeviceEnrollment({ accountId, record }: { accountId: string; record: BrowserDeviceRecord }) {
  const [passphrase, setPassphrase] = useState(""); const [qr, setQr] = useState<string | null>(null); const [offer, setOffer] = useState(""); const [sas, setSas] = useState(""); const [working, setWorking] = useState(false); const [error, setError] = useState<string | null>(null); const [approved, setApproved] = useState(false);
  useEffect(() => {
    let cancelled = false; let timer: number | undefined; let attempts = 0;
    const delays = [2_000, 5_000, 10_000];
    const poll = async () => {
      if (cancelled || document.visibilityState === "hidden" || !navigator.onLine) return;
      try {
        const response = await fetch(`/api/vault/enrollment-status?deviceId=${encodeURIComponent(record.deviceId)}`, { cache: "no-store" });
        const status = await readVaultCborResponse(response, "Could not check device approval.");
        if (!cancelled && status.get(3) === "active") { setApproved(true); return; }
      } catch { /* transient polling errors remain non-blocking */ }
      if (!cancelled) { timer = window.setTimeout(() => void poll(), delays[Math.min(attempts++, delays.length - 1)]); }
    };
    const resume = () => { if (document.visibilityState === "visible" && navigator.onLine) void poll(); };
    document.addEventListener("visibilitychange", resume); window.addEventListener("online", resume); void poll();
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); document.removeEventListener("visibilitychange", resume); window.removeEventListener("online", resume); };
  }, [accountId, record.deviceId]);
  async function restore() {
    setWorking(true); setError(null); let unlock: Uint8Array | null = null;
    try {
      if (!record.pendingOfferCiphertext || !record.pendingOfferNonce) throw new Error("The pending approval QR is unavailable; restart enrollment.");
      if (record.protectionProfile === "webauthn-prf-wrapped") {
        if (!record.webauthnCredentialId || !record.prfInput || !record.webauthnRpId) throw new Error("Passkey metadata is incomplete.");
        unlock = await getVaultPrfOutput({ credentialId: record.webauthnCredentialId, prfInput: record.prfInput, rpId: record.webauthnRpId });
      } else { if (!record.passphraseKdfSalt) throw new Error("Passphrase metadata is incomplete."); unlock = await deriveVaultPassphraseKey(passphrase, record.passphraseKdfSalt); }
      const key = await deriveVaultKey(unlock, record.bundleSalt, "browserUnlock", utf8(`${accountId}\0${record.deviceId}\0pending-offer:1`));
      const offer = new TextDecoder().decode(await decryptAesGcm(key, { nonce: record.pendingOfferNonce, ciphertext: record.pendingOfferCiphertext }, utf8(`clipsx/vault/v1/pending-offer\0${accountId}\0${record.deviceId}`)));
      const decodedOffer = await decodePendingDeviceOffer(offer, accountId);
      setOffer(offer); setSas(decodedOffer.sas);
      setQr(await QRCode.toDataURL(offer, { width: 320, margin: 2, errorCorrectionLevel: "M" }));
      const statusResponse = await fetch(`/api/vault/enrollment-status?deviceId=${encodeURIComponent(record.deviceId)}`, { cache: "no-store" });
      const status = await readVaultCborResponse(statusResponse, "Could not check device approval.");
      const accountHead = status.get(4); const sessionId = status.get(5);
      if (status.get(3) === "active") {
        if (!(accountHead instanceof Uint8Array) || typeof sessionId !== "string") throw new Error("Approved device state is incomplete.");
        const runtime = new BrowserVaultRuntime(accountId);
        try {
          await runtime.unlock(record, unlock);
          unlock = null;
          const command = await runtime.signSessionBinding({ deviceId: record.deviceId, sessionId, expectedAccountHead: accountHead });
          const binding = await fetch("/api/vault/commands", { method: "POST", headers: { "Content-Type": "application/cbor" }, body: body(command) });
          await readVaultCborResponse(binding, "Approved device session binding was rejected.");
          const { pendingOfferCiphertext: _ciphertext, pendingOfferNonce: _nonce, ...activeRecord } = record;
          void _ciphertext; void _nonce;
          await saveBrowserDeviceRecord({ ...activeRecord, enrollmentStatus: "active", updatedAt: new Date().toISOString() });
        } finally { runtime.dispose(); }
        window.location.reload();
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not restore approval."); } finally { unlock?.fill(0); setWorking(false); }
  }
  return <div className="px-4 py-24"><div className="mx-auto max-w-xl space-y-4 rounded-xl border p-6"><h1 className="font-heading text-3xl font-black">Add browser</h1><p className="text-sm text-slate-600 dark:text-slate-300">{approved ? "Approved. Confirm your local unlock method to finish binding this browser." : "Waiting for approval from an existing browser. This page checks automatically while it is open."}</p>{record.protectionProfile === "vault-passphrase-wrapped" && <input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} className="w-full rounded-lg border px-3 py-2" />}<Button loading={working} onClick={restore}>{approved ? "Unlock and finish" : "Show approval QR"}</Button>{qr && <div className="space-y-3 text-center"><Image src={qr} width={320} height={320} unoptimized alt="Pending vault device approval QR" className="mx-auto" /><Button onClick={() => void navigator.clipboard.writeText(offer)}>Copy approval offer</Button><p className="font-mono text-3xl font-black tracking-widest">{sas}</p></div>}{error && <p role="alert" className="text-red-600">{error}</p>}</div></div>;
}

function VaultUnlock({
  accountId,
  record,
  children,
}: {
  accountId: string;
  record: BrowserDeviceRecord;
  children?: ReactNode;
}) {
  const [passphrase, setPassphrase] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState(() => record.unlockSlots?.[0]?.id ?? "");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [collections, setCollections] = useState<
    Array<{ id: string; title: string }>
  >([]);
  const [collectionTitle, setCollectionTitle] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [itemType, setItemType] = useState<"note" | "login">("note");
  const [itemTitle, setItemTitle] = useState("");
  const [itemBody, setItemBody] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const [items, setItems] = useState<VaultItemHead[]>([]);
  const [editing, setEditing] = useState<VaultItemHead | null>(null);
  const [draft, setDraft] = useState<VaultItemContent | null>(null);
  const [conflict, setConflict] = useState<NoteConflict | null>(null);
  const [mergeDraft, setMergeDraft] = useState<VaultItemContent | null>(null);
  const [deviceOffer, setDeviceOffer] = useState("");
  const [deviceApproval, setDeviceApproval] = useState<{
    command: Uint8Array;
    sas: string;
    deviceId: string;
  } | null>(null);
  const [sasConfirmed, setSasConfirmed] = useState(false);
  const runtimeRef = useRef<BrowserVaultRuntime | null>(null);
  const checkpointRef = useRef({
    sequence: record.accountCheckpointSequence,
    hash: record.accountCheckpointHash,
  });

  function clearPlaintext() {
    setItems([]);
    setEditing(null);
    setDraft(null);
    setConflict(null);
    setMergeDraft(null);
    setItemTitle("");
    setItemBody("");
    setUsername("");
    setPassword("");
    setUrl("");
  }

  useEffect(() => {
    const runtime = new BrowserVaultRuntime(accountId);
    runtimeRef.current = runtime;
    runtime.onLock = clearPlaintext;
    const lockOnPageExit = () => {
      clearPlaintext();
      void runtime.lock();
    };
    window.addEventListener("pagehide", lockOnPageExit);
    return () => {
      window.removeEventListener("pagehide", lockOnPageExit);
      clearPlaintext();
      runtime.onLock = null;
      runtime.dispose();
      runtimeRef.current = null;
    };
  }, [accountId]);
  useEffect(() => {
    let timeout: number | undefined;
    const reset = () => {
      if (timeout) window.clearTimeout(timeout);
      void loadVaultSettings(accountId).then((settings) => {
        if (settings.autoLockMinutes !== "never") timeout = window.setTimeout(() => void runtimeRef.current?.lock(), settings.autoLockMinutes * 60_000);
      }).catch(() => undefined);
    };
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart"];
    events.forEach((event) => window.addEventListener(event, reset)); reset();
    return () => { if (timeout) window.clearTimeout(timeout); events.forEach((event) => window.removeEventListener(event, reset)); };
  }, [accountId]);

  async function unlock() {
    setWorking(true);
    setError(null);
    let material: Uint8Array | null = null;
    try {
      const selectedSlot = record.unlockSlots?.find((slot) => slot.id === selectedSlotId) ?? record.unlockSlots?.[0];
      const isPasskey = selectedSlot ? selectedSlot.kind === "passkey" : record.protectionProfile === "webauthn-prf-wrapped";
      if (isPasskey) {
        if (
          !(selectedSlot?.webauthnCredentialId ?? record.webauthnCredentialId) ||
          !(selectedSlot?.prfInput ?? record.prfInput) ||
          !(selectedSlot?.webauthnRpId ?? record.webauthnRpId)
        )
          throw new Error("This browser’s passkey metadata is incomplete.");
        material = await getVaultPrfOutput({
          credentialId: selectedSlot?.webauthnCredentialId ?? record.webauthnCredentialId!,
          prfInput: selectedSlot?.prfInput ?? record.prfInput!,
          rpId: selectedSlot?.webauthnRpId ?? record.webauthnRpId!,
        });
      } else {
        const salt = selectedSlot?.passphraseKdfSalt ?? record.passphraseKdfSalt;
        if (!salt)
          throw new Error("This browser’s passphrase metadata is incomplete.");
        material = await deriveVaultPassphraseKey(
          passphrase,
          salt,
        );
        setPassphrase("");
      }
      if (!runtimeRef.current) throw new Error("Vault runtime is not ready.");
      await runtimeRef.current.unlock(selectedSlot ? { ...record, unlockSlots: [selectedSlot] } : record, material);
      await refreshCollections();
      setUnlocked(true);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Vault unlock failed.",
      );
    } finally {
      material?.fill(0);
      setWorking(false);
    }
  }

  async function refreshAccountSync() {
    if (!runtimeRef.current) throw new Error("Vault runtime is not ready.");
    const pages = await readVaultPages(
      `/api/vault/account-sync?accountId=${encodeURIComponent(accountId)}`,
      "account",
    );
    const verified = await runtimeRef.current.openAccountSync({
      deviceId: record.deviceId,
      pages,
      checkpointSequence: checkpointRef.current.sequence,
      checkpointHash: checkpointRef.current.hash,
    });
    checkpointRef.current = { sequence: verified.sequence, hash: verified.accountHead };
    await saveBrowserDeviceRecord({
      ...record,
      enrollmentStatus: "active",
      accountCheckpointSequence: verified.sequence,
      accountCheckpointHash: verified.accountHead,
      updatedAt: new Date().toISOString(),
    });
  }

  async function refreshCollections() {
    if (!runtimeRef.current) throw new Error("Vault runtime is not ready.");
    await refreshAccountSync();
    const bootstrapResponse = await fetch("/api/vault/bootstrap", {
      cache: "no-store",
    });
    const bootstrap = await readVaultCborResponseBytes(
      bootstrapResponse,
      "Could not load encrypted vault records.",
    );
    const opened = await runtimeRef.current.openBootstrap(
      bootstrap.bytes,
    );
    setCollections(opened);
    setSelectedCollectionId((current) =>
      opened.some((collection) => collection.id === current)
        ? current
        : (opened[0]?.id ?? ""),
    );
  }

  async function submitCommand(command: Uint8Array, fallback: string) {
    const response = await fetch("/api/vault/commands", {
      method: "POST",
      headers: { "Content-Type": "application/cbor" },
      body: body(command),
    });
    return readVaultCborResponse(response, fallback);
  }

  async function createCollection() {
    const title = collectionTitle.trim();
    if (!title) {
      setError("Enter a collection name.");
      return;
    }
    setWorking(true);
    setError(null);
    try {
      if (!runtimeRef.current) throw new Error("Vault runtime is not ready.");
      const created = await runtimeRef.current.createCollection({
        deviceId: record.deviceId,
        metadataTitle: title,
      });
      await submitCommand(created.command, "Could not create the encrypted collection.");
      setCollectionTitle("");
      await refreshCollections();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not create the encrypted collection.",
      );
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

  async function refreshItems(
    collectionId = selectedCollectionId,
  ): Promise<VaultItemHead[]> {
    if (!runtimeRef.current || !collectionId) return [];
    const pages = await readVaultPages(
      `/api/vault/collections/${encodeURIComponent(collectionId)}/sync`,
      "collection",
    );
    const opened = await runtimeRef.current.openCollectionSync({
      deviceId: record.deviceId,
      collectionId,
      pages,
    });
    setItems(opened);
    return opened;
  }

  function itemContent(item: VaultItemContent): VaultItemContent {
    return {
      type: item.type,
      title: item.title,
      body: item.body,
      username: item.username,
      password: item.password,
      url: item.url,
      labels: [...item.labels],
    };
  }

  async function submitUpdate(remote: VaultItemHead, local: VaultItemContent) {
    if (!runtimeRef.current || !selectedCollectionId)
      throw new Error("Vault runtime is not ready.");
    const created = await runtimeRef.current.updateNote({
      deviceId: record.deviceId,
      collectionId: selectedCollectionId,
      noteId: remote.id,
      revisionNumber: remote.revisionNumber + 1,
      previousRevisionHash: remote.revisionHash,
      content: local,
    });
    const response = await fetch("/api/vault/commands", {
      method: "POST",
      headers: { "Content-Type": "application/cbor" },
      body: body(created.command),
    });
    if (isStaleNoteUpdate(response.status)) {
      await refreshCollections();
      const refreshed = await refreshItems(selectedCollectionId);
      const accepted = refreshed.find((item) => item.id === remote.id);
      if (!accepted)
        throw new Error(
          "The conflicting remote item was not returned by verified sync.",
        );
      setEditing(null);
      setDraft(null);
      setMergeDraft(null);
      setConflict(beginNoteConflict(local, accepted));
      return;
    }
    await readVaultCborResponse(response, "Could not update the encrypted item.");
    setEditing(null);
    setDraft(null);
    setConflict(null);
    setMergeDraft(null);
    await refreshCollections();
    await refreshItems(selectedCollectionId);
  }

  async function saveEdit() {
    if (!editing || !draft) return;
    setWorking(true);
    setError(null);
    try {
      await submitUpdate(editing, draft);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not update the encrypted item.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function reapplyConflict() {
    if (!conflict) return;
    setWorking(true);
    setError(null);
    try {
      await submitUpdate(conflict.remote, reapplyLocalResolution(conflict));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not reapply the encrypted draft.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function saveManualMerge() {
    if (!conflict || !mergeDraft) return;
    setWorking(true);
    setError(null);
    try {
      await submitUpdate(
        conflict.remote,
        manualMergeResolution(conflict, mergeDraft),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save the merged encrypted item.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function deleteItem(item: VaultItemHead) {
    if (
      !runtimeRef.current ||
      !selectedCollectionId ||
      !window.confirm(
        "Delete this encrypted item? This removes its server ciphertext and cannot be undone.",
      )
    )
      return;
    setWorking(true);
    setError(null);
    try {
      const deleted = await runtimeRef.current.deleteNote({
        deviceId: record.deviceId,
        collectionId: selectedCollectionId,
        noteId: item.id,
        previousRevisionHash: item.revisionHash,
      });
      await submitCommand(deleted.command, "Could not delete the encrypted item. Refresh and try again if it changed.");
      setEditing(null);
      setDraft(null);
      setConflict(null);
      setMergeDraft(null);
      await refreshCollections();
      await refreshItems(selectedCollectionId);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not delete the encrypted item.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function createItem() {
    if (!selectedCollectionId || !itemTitle.trim()) {
      setError("Choose a collection and enter a title.");
      return;
    }
    if (itemType === "login" && (!username || !password)) {
      setError("A login needs a username and password.");
      return;
    }
    setWorking(true);
      setError(null);
      try {
        if (!runtimeRef.current) throw new Error("Vault runtime is not ready.");
      const created = await runtimeRef.current.createNote({
        deviceId: record.deviceId,
        collectionId: selectedCollectionId,
        content:
          itemType === "note"
            ? {
                type: "note",
                title: itemTitle.trim(),
                body: itemBody,
                labels: [],
              }
            : {
                type: "login",
                title: itemTitle.trim(),
                username,
                password,
                url,
                labels: [],
              },
      });
      await submitCommand(created.command, "Could not save the encrypted item.");
      setItemTitle("");
      setItemBody("");
      setUsername("");
      setPassword("");
      setUrl("");
      await refreshCollections();
      await refreshItems(selectedCollectionId);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save the encrypted item.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function reviewDeviceApproval() {
    if (!runtimeRef.current || !deviceOffer.trim()) return;
    setWorking(true);
    setError(null);
    try {
      setDeviceApproval(
        await runtimeRef.current.authorizeDevice({
          deviceId: record.deviceId,
          offer: deviceOffer.trim(),
        }),
      );
      setSasConfirmed(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not verify the enrollment QR.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function approveDevice() {
    if (!deviceApproval || !sasConfirmed) return;
    setWorking(true);
    setError(null);
    try {
      await submitCommand(deviceApproval.command, "Device authorization was rejected.");
      setDeviceOffer("");
      setDeviceApproval(null);
      setSasConfirmed(false);
      await refreshCollections();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not approve the device.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function createVaultCollection(title: string): Promise<string> {
    const value = title.trim();
    if (!value) throw new Error("Enter a collection name.");
    if (!runtimeRef.current) throw new Error("Vault runtime is not ready.");
    setWorking(true);
    setError(null);
    try {
      const created = await runtimeRef.current.createCollection({
        deviceId: record.deviceId,
        metadataTitle: value,
      });
      await submitCommand(created.command, "Could not create the encrypted collection.");
      await refreshCollections();
      return created.collectionId;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not create the encrypted collection.";
      setError(message);
      throw new Error(message);
    } finally {
      setWorking(false);
    }
  }

  async function createVaultItem(collectionId: string, content: VaultItemContent): Promise<VaultItemHead[]> {
    if (!runtimeRef.current) throw new Error("Vault runtime is not ready.");
    setWorking(true);
    setError(null);
    try {
      const created = await runtimeRef.current.createNote({ deviceId: record.deviceId, collectionId, content });
      await submitCommand(created.command, "Could not save the encrypted item.");
      await refreshCollections();
      return await refreshItems(collectionId);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not save the encrypted item.";
      setError(message);
      throw new Error(message);
    } finally {
      setWorking(false);
    }
  }

  async function updateVaultItem(collectionId: string, item: VaultItemHead, content: VaultItemContent): Promise<VaultUpdateResult> {
    if (!runtimeRef.current) throw new Error("Vault runtime is not ready.");
    setWorking(true);
    setError(null);
    try {
      const created = await runtimeRef.current.updateNote({
        deviceId: record.deviceId,
        collectionId,
        noteId: item.id,
        revisionNumber: item.revisionNumber + 1,
        previousRevisionHash: item.revisionHash,
        content,
      });
      const response = await fetch("/api/vault/commands", {
        method: "POST",
        headers: { "Content-Type": "application/cbor" },
        body: body(created.command),
      });
      if (isStaleNoteUpdate(response.status)) {
        await refreshCollections();
        const refreshed = await refreshItems(collectionId);
        const remote = refreshed.find((candidate) => candidate.id === item.id);
        if (!remote) throw new Error("The conflicting remote item was not returned by verified sync.");
        return { kind: "conflict", conflict: beginNoteConflict(content, remote) };
      }
      await readVaultCborResponse(response, "Could not update the encrypted item.");
      await refreshCollections();
      return { kind: "saved", items: await refreshItems(collectionId) };
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not update the encrypted item.";
      setError(message);
      throw new Error(message);
    } finally {
      setWorking(false);
    }
  }

  async function deleteVaultItem(collectionId: string, item: VaultItemHead): Promise<VaultItemHead[]> {
    if (!runtimeRef.current) throw new Error("Vault runtime is not ready.");
    setWorking(true);
    setError(null);
    try {
      const deleted = await runtimeRef.current.deleteNote({
        deviceId: record.deviceId,
        collectionId,
        noteId: item.id,
        previousRevisionHash: item.revisionHash,
      });
      await submitCommand(deleted.command, "Could not delete the encrypted item. Refresh and try again if it changed.");
      await refreshCollections();
      return await refreshItems(collectionId);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not delete the encrypted item.";
      setError(message);
      throw new Error(message);
    } finally {
      setWorking(false);
    }
  }

  async function reviewVaultDeviceApproval(offer: string) {
    if (!runtimeRef.current || !offer.trim()) throw new Error("Paste an approval offer first.");
    setWorking(true);
    setError(null);
    try {
      return await runtimeRef.current.authorizeDevice({ deviceId: record.deviceId, offer: offer.trim() });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not verify the enrollment QR.";
      setError(message);
      throw new Error(message);
    } finally {
      setWorking(false);
    }
  }

  async function approveVaultDevice(command: Uint8Array) {
    setWorking(true);
    setError(null);
    try {
      await submitCommand(command, "Device authorization was rejected.");
      await refreshCollections();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not approve the device.";
      setError(message);
      throw new Error(message);
    } finally {
      setWorking(false);
    }
  }

  if (unlocked) {
    const session: VaultSession = {
      record,
      collections,
      working,
      error,
      clearError: () => setError(null),
      refreshCollections,
      createCollection: createVaultCollection,
      loadItems: refreshItems,
      createItem: createVaultItem,
      updateItem: updateVaultItem,
      deleteItem: deleteVaultItem,
      reviewDeviceApproval: reviewVaultDeviceApproval,
      approveDevice: approveVaultDevice,
      lock,
    };
    return <VaultSessionContext.Provider value={session}>{children}</VaultSessionContext.Provider>;
  }

  if (unlocked)
    return (
      <div className="px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-2xl rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-6">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            Vault unlocked
          </p>
          <h1 className="mt-2 font-heading text-3xl font-black">
            Your collections
          </h1>
          <p className="mt-3 text-sm text-gray-700 dark:text-gray-200">
            Collection names and saved-item plaintext are decrypted and
            encrypted only inside the vault worker.
          </p>
          <div className="mt-5 flex gap-2">
            <input
              value={collectionTitle}
              onChange={(event) => setCollectionTitle(event.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5"
              placeholder="Collection name"
              maxLength={128}
            />
            <Button loading={working} onClick={createCollection}>
              Create collection
            </Button>
          </div>
          <section className="mt-5 space-y-3 rounded-lg border border-emerald-500/30 bg-white/50 p-4 dark:bg-gray-900/50">
            <h2 className="font-semibold">Save encrypted item</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={selectedCollectionId}
                onChange={(event) => {
                  setSelectedCollectionId(event.target.value);
                  clearPlaintext();
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5"
              >
                <option value="">Choose collection</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.title}
                  </option>
                ))}
              </select>
              <select
                value={itemType}
                onChange={(event) =>
                  setItemType(event.target.value as "note" | "login")
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5"
              >
                <option value="note">Note</option>
                <option value="login">Login</option>
              </select>
            </div>
            <input
              value={itemTitle}
              onChange={(event) => setItemTitle(event.target.value)}
              placeholder="Title"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5"
            />
            {itemType === "note" ? (
              <textarea
                value={itemBody}
                onChange={(event) => setItemBody(event.target.value)}
                placeholder="Note"
                className="min-h-24 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5"
              />
            ) : (
              <>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Username"
                  autoComplete="off"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5"
                />
                <input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="URL (optional)"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5"
                />
              </>
            )}
            <Button loading={working} onClick={createItem}>
              Save encrypted {itemType}
            </Button>
          </section>
          <Button
            className="mt-5"
            variant="outline"
            onClick={() =>
              void refreshItems().catch((caught) =>
                setError(
                  caught instanceof Error
                    ? caught.message
                    : "Could not sync encrypted items.",
                ),
              )
            }
          >
            Refresh encrypted items
          </Button>
          <ul className="mt-3 space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-emerald-500/30 bg-white/50 p-3 dark:bg-gray-900/50"
              >
                <div className="flex items-center justify-between gap-3">
                  <b>{item.title}</b>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditing(item);
                        setDraft(itemContent(item));
                        setConflict(null);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      loading={working}
                      onClick={() => void deleteItem(item)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">
                  {item.type === "note"
                    ? item.body
                    : `${item.username} · ${item.password}`}
                </p>
              </li>
            ))}
          </ul>
          {editing && draft && (
            <section className="mt-5 space-y-3 rounded-lg border border-cyan-500/40 bg-white/50 p-4 dark:bg-gray-900/50">
              <h2 className="font-semibold">Edit encrypted item</h2>
              <VaultItemEditor value={draft} onChange={setDraft} />
              <div className="flex gap-2">
                <Button loading={working} onClick={saveEdit}>
                  Save new revision
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(null);
                    setDraft(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </section>
          )}
          {conflict && (
            <section className="mt-5 space-y-3 rounded-lg border border-amber-500/50 bg-amber-50 p-4 dark:bg-amber-500/10">
              <h2 className="font-semibold">Update conflict</h2>
              <p className="text-sm">
                A verified remote revision was accepted first. Your draft is
                held only in this page’s memory and will be lost if you lock,
                leave, or close this page.
              </p>
              <div className="rounded border border-amber-500/30 p-3 text-sm">
                <b>Verified remote: {conflict.remote.title}</b>
                <p className="whitespace-pre-wrap">
                  {conflict.remote.type === "note"
                    ? conflict.remote.body
                    : `${conflict.remote.username} · ${conflict.remote.password}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    keepRemoteResolution();
                    setConflict(null);
                    setMergeDraft(null);
                  }}
                >
                  Keep remote
                </Button>
                <Button loading={working} onClick={reapplyConflict}>
                  Reapply local
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setMergeDraft(itemContent(conflict.local))}
                >
                  Manual merge
                </Button>
              </div>
              {mergeDraft && (
                <div className="space-y-3 rounded border border-amber-500/30 p-3">
                  <p className="text-sm">
                    Edit the merged fields, then save a fresh revision from the
                    verified remote head.
                  </p>
                  <VaultItemEditor
                    value={mergeDraft}
                    onChange={setMergeDraft}
                  />
                  <Button loading={working} onClick={saveManualMerge}>
                    Save merged revision
                  </Button>
                </div>
              )}
            </section>
          )}
          <DeviceApproval
            offer={deviceOffer}
            onOffer={setDeviceOffer}
            approval={deviceApproval}
            confirmed={sasConfirmed}
            onConfirmed={setSasConfirmed}
            working={working}
            onReview={() => void reviewDeviceApproval()}
            onApprove={() => void approveDevice()}
          />
          {error && (
            <p
              role="alert"
              className="mt-3 text-sm text-red-600 dark:text-red-400"
            >
              {error}
            </p>
          )}
          <ul className="mt-5 space-y-2">
            {collections.length === 0 ? (
              <li className="text-sm text-gray-600 dark:text-gray-300">
                No encrypted collections yet.
              </li>
            ) : (
              collections.map((collection) => (
                <li
                  key={collection.id}
                  className="rounded-lg border border-emerald-500/30 bg-white/50 px-4 py-3 font-medium dark:bg-gray-900/50"
                >
                  {collection.title}
                </li>
              ))
            )}
          </ul>
          <Button
            className="mt-6"
            variant="outline"
            loading={working}
            onClick={lock}
          >
            Lock vault
          </Button>
        </div>
      </div>
    );
  return (
    <div className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-xl rounded-xl border border-gray-200 p-6 dark:border-white/10">
        <p className="text-sm font-semibold text-cyan-600">Encrypted vault</p>
        <h1 className="mt-2 font-heading text-3xl font-black">
          Unlock your vault
        </h1>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
          {(record.unlockSlots?.find((slot) => slot.id === selectedSlotId)?.kind ?? (record.protectionProfile === "webauthn-prf-wrapped" ? "passkey" : "passphrase")) === "passkey"
            ? "Confirm with the dedicated vault passkey on this browser."
            : "Enter this browser’s vault passphrase."}
        </p>
        {(record.unlockSlots?.length ?? 0) > 1 && <div className="mt-4 flex gap-2">{record.unlockSlots!.map((slot) => <button key={slot.id} type="button" onClick={() => { setSelectedSlotId(slot.id); setPassphrase(""); }} className={`rounded-lg px-3 py-2 text-sm ${slot.id === selectedSlotId ? "bg-cyan-600 text-white" : "bg-slate-100 dark:bg-white/10"}`}>{slot.kind === "passkey" ? "Passkey" : "Passphrase"}</button>)}</div>}
        {(record.unlockSlots?.find((slot) => slot.id === selectedSlotId)?.kind ?? (record.protectionProfile === "webauthn-prf-wrapped" ? "passkey" : "passphrase")) === "passphrase" && (
          <input
            type="password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
            className="mt-5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5"
            autoComplete="current-password"
          />
        )}
        {error && (
          <p
            role="alert"
            className="mt-4 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        )}
        <Button className="mt-6" loading={working} onClick={unlock}>
          Unlock vault
        </Button>
      </div>
    </div>
  );
}

function DeviceApproval({
  offer, onOffer, approval, confirmed, onConfirmed, working, onReview, onApprove,
}: {
  offer: string; onOffer: (value: string) => void;
  approval: { command: Uint8Array; sas: string; deviceId: string } | null;
  confirmed: boolean; onConfirmed: (value: boolean) => void; working: boolean;
  onReview: () => void; onApprove: () => void;
}) {
  return (
    <section className="mt-6 space-y-3 rounded-lg border border-cyan-500/40 bg-white/50 p-4 dark:bg-gray-900/50">
      <h2 className="font-semibold">Approve another browser</h2>
      <p className="text-sm">Scan the QR on the new browser, or paste its QR payload here. Approval requires comparing the SAS on both screens.</p>
      <textarea value={offer} onChange={(event) => onOffer(event.target.value)} className="min-h-20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs dark:border-white/20 dark:bg-white/5" autoComplete="off" spellCheck={false} placeholder="Enrollment QR payload" />
      <Button variant="outline" loading={working} onClick={onReview}>Verify QR</Button>
      {approval && <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-50 p-4 dark:bg-amber-500/10">
        <p className="text-sm">Compare this code with the new browser:</p>
        <p className="font-mono text-2xl font-black tracking-widest">{approval.sas}</p>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={(event) => onConfirmed(event.target.checked)} />Both screens show the same SAS and I recognize this browser.</label>
        <Button loading={working} disabled={!confirmed} onClick={onApprove}>Authorize device and deliver current keys</Button>
      </div>}
    </section>
  );
}

function VaultItemEditor({
  value,
  onChange,
}: {
  value: VaultItemContent;
  onChange: (value: VaultItemContent) => void;
}) {
  const change = (patch: Partial<VaultItemContent>) =>
    onChange({ ...value, ...patch });
  return (
    <>
      <input
        value={value.title}
        onChange={(event) => change({ title: event.target.value })}
        placeholder="Title"
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5"
      />
      {value.type === "note" ? (
        <textarea
          value={value.body ?? ""}
          onChange={(event) => change({ body: event.target.value })}
          placeholder="Note"
          className="min-h-24 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5"
        />
      ) : (
        <>
          <input
            value={value.username ?? ""}
            onChange={(event) => change({ username: event.target.value })}
            placeholder="Username"
            autoComplete="off"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5"
          />
          <input
            type="password"
            value={value.password ?? ""}
            onChange={(event) => change({ password: event.target.value })}
            placeholder="Password"
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5"
          />
          <input
            value={value.url ?? ""}
            onChange={(event) => change({ url: event.target.value })}
            placeholder="URL (optional)"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-white/20 dark:bg-white/5"
          />
        </>
      )}
    </>
  );
}
