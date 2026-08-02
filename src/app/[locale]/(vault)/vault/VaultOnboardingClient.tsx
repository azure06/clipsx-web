"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { AlertTriangle, Copy, LockKeyhole, ShieldCheck, ShieldOff } from "lucide-react";

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
import { createUnlockSlot, encryptBundle, removeUnlockSlot, unwrapBundleKey } from "@/lib/vault/browser-unlock-slots";
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

export type VaultSession = {
  email: string;
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
  addPasskeyUnlockSlot: (confirmationSlotId: string, confirmationPassphrase: string) => Promise<void>;
  addPassphraseUnlockSlot: (confirmationSlotId: string, confirmationPassphrase: string, newPassphrase: string) => Promise<void>;
  removeUnlockSlot: (confirmationSlotId: string, confirmationPassphrase: string, slotId: string) => Promise<void>;
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

export function VaultOnboardingClient({ accountId, email = "", children }: { accountId: string; email?: string; children?: ReactNode }) {
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
    return <VaultLoadingCard />;
  if (existingRecord?.enrollmentStatus === "pending")
    return <PendingDeviceEnrollment accountId={accountId} record={existingRecord} />;
  if (existingRecord?.enrollmentStatus === "registering")
    return <RegisteringDeviceEnrollment accountId={accountId} record={existingRecord} />;
  if (currentInspection?.failed)
    return <EnrollmentInspectionFailure />;
  if (serverHasVault === undefined)
    return <VaultLoadingCard />;
  if (existingRecord && serverDeviceStatus !== "active")
    return (
      <StaleDeviceEnrollment
        accountId={accountId}
        record={existingRecord}
        serverHasVault={serverHasVault}
      />
    );
  if (existingRecord)
    return <VaultUnlock accountId={accountId} email={email} record={existingRecord}>{children}</VaultUnlock>;
  if (serverHasVault) return <NewDeviceEnrollment accountId={accountId} />;
  return <CreateVaultScreen phrase={phrase} profile={profile} setProfile={setProfile} passphrase={passphrase} setPassphrase={setPassphrase} prfSupported={prfSupported} error={error} working={working} onEnroll={enroll} />;
}

function EnrollmentInspectionFailure() {
  return (
    <EnrollmentErrorCard
      variant="error"
      heading="Could not inspect your vault"
      description="Vault setup is blocked until the server state can be checked. This prevents accidentally creating a second recovery root."
      action={<Button onClick={() => window.location.reload()}>Try again</Button>}
    />
  );
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

  return (
    <EnrollmentErrorCard
      variant="warning"
      heading="This browser is no longer registered"
      description={
        serverHasVault
          ? "The encrypted local keys do not belong to an active server device. Remove this local record, then approve this browser as a new device."
          : "The server vault was reset, but this browser still has its old encrypted device record. Remove it before creating a fresh vault."
      }
      error={error}
      action={<Button loading={working} onClick={removeStaleRecord}>Remove local device record</Button>}
    />
  );
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

  return (
    <EnrollmentErrorCard
      variant="warning"
      heading="Finish vault registration"
      description="The encrypted browser bundle was saved, but the last server response was incomplete. Check the authoritative registration state before retrying."
      error={error}
      action={<Button loading={working} onClick={reconcile}>Check registration</Button>}
    />
  );
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
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-16 sm:px-6">
      <div className="w-full max-w-lg space-y-6 rounded-2xl border border-(--vault-border) bg-(--vault-surface) p-8 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-(--vault-accent-subtle) text-(--vault-accent) ring-1 ring-(--vault-accent)/20">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--vault-accent)">Encrypted vault</p>
            <h1 className="font-heading text-2xl font-bold">Approve this browser</h1>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Protect this browser's new local key bundle first, then scan the QR code with an already-unlocked device and compare the security code.
        </p>
        {!qr && (
          <div className="space-y-5">
            <UnlockMethodCards
              profile={profile}
              setProfile={setProfile}
              prfSupported={prfSupported}
              passphrase={passphrase}
              setPassphrase={setPassphrase}
              passphraseLabel="New vault passphrase"
              passphraseAutoComplete="new-password"
            />
            {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <Button className="w-full" loading={working} onClick={begin}>Create approval QR</Button>
          </div>
        )}
        {qr && (
          <div className="space-y-5 text-center">
            <Image src={qr} width={280} height={280} unoptimized alt="Pending vault device approval QR" className="mx-auto rounded-xl border border-(--vault-border)" />
            <Button variant="secondary" size="sm" onClick={() => void navigator.clipboard.writeText(offer)}>
              <Copy size={14} /> Copy approval offer
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-400">Use "Copy approval offer" when both devices are desktop browsers without cameras.</p>
            <div className="rounded-xl border border-(--vault-border) bg-(--vault-muted)/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Security code (SAS)</p>
              <p className="mt-2 font-mono text-3xl font-black tracking-widest text-(--vault-accent)">{sas}</p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Keep this page open until the existing device confirms the code matches.</p>
            </div>
            {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
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
      if (status.get(3) === "active") {
        const runtime = new BrowserVaultRuntime(accountId);
        try {
          await runtime.unlock(record, unlock);
          unlock = null;
          const { pendingOfferCiphertext: _ciphertext, pendingOfferNonce: _nonce, ...activeRecord } = record;
          void _ciphertext; void _nonce;
          await saveBrowserDeviceRecord({ ...activeRecord, enrollmentStatus: "active", updatedAt: new Date().toISOString() });
        } finally { runtime.dispose(); }
        window.location.reload();
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not restore approval."); } finally { unlock?.fill(0); setWorking(false); }
  }
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-16 sm:px-6">
      <div className="w-full max-w-lg space-y-6 rounded-2xl border border-(--vault-border) bg-(--vault-surface) p-8 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-(--vault-accent-subtle) text-(--vault-accent) ring-1 ring-(--vault-accent)/20">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--vault-accent)">Encrypted vault</p>
            <h1 className="font-heading text-2xl font-bold">Add browser</h1>
          </div>
        </div>
        <div className={`rounded-lg border px-4 py-3 text-sm ${approved ? "border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200" : "border-(--vault-border) bg-(--vault-muted)/40 text-gray-600 dark:text-gray-300"}`}>
          {approved
            ? "Approved. Confirm your local unlock method to finish binding this browser."
            : "Waiting for approval from an existing browser. This page checks automatically while it is open."}
        </div>
        {record.protectionProfile === "vault-passphrase-wrapped" && (
          <label className="block text-sm font-medium">
            Vault passphrase
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="input-vault mt-1.5"
              autoComplete="current-password"
            />
          </label>
        )}
        <Button className="w-full" loading={working} onClick={restore}>
          {approved ? "Unlock and finish" : "Show approval QR"}
        </Button>
        {qr && (
          <div className="space-y-4 text-center">
            <Image src={qr} width={280} height={280} unoptimized alt="Pending vault device approval QR" className="mx-auto rounded-xl border border-(--vault-border)" />
            <Button variant="secondary" size="sm" onClick={() => void navigator.clipboard.writeText(offer)}>
              <Copy size={14} /> Copy approval offer
            </Button>
            <div className="rounded-xl border border-(--vault-border) bg-(--vault-muted)/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Security code (SAS)</p>
              <p className="mt-2 font-mono text-3xl font-black tracking-widest text-(--vault-accent)">{sas}</p>
            </div>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}

function VaultUnlock({
  accountId,
  email,
  record,
  children,
}: {
  accountId: string;
  email: string;
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
    const bootstrapResponse = await fetch(`/api/vault/bootstrap?deviceId=${encodeURIComponent(record.deviceId)}`, {
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

  async function confirmBundleKey(confirmationSlotId: string, confirmationPassphrase: string): Promise<Uint8Array> {
    const slot = record.unlockSlots?.find((candidate) => candidate.id === confirmationSlotId);
    if (!slot) throw new Error("Choose a current unlock method to confirm this change.");
    let material: Uint8Array | null = null;
    try {
      if (slot.kind === "passkey") {
        if (!slot.webauthnCredentialId || !slot.prfInput || !slot.webauthnRpId) throw new Error("This passkey's metadata is incomplete.");
        material = await getVaultPrfOutput({ credentialId: slot.webauthnCredentialId, prfInput: slot.prfInput, rpId: slot.webauthnRpId });
      } else {
        if (!slot.passphraseKdfSalt) throw new Error("This passphrase's metadata is incomplete.");
        material = await deriveVaultPassphraseKey(confirmationPassphrase, slot.passphraseKdfSalt);
      }
      return await unwrapBundleKey({ slot, unlockMaterial: material, accountId, deviceId: record.deviceId });
    } finally {
      material?.fill(0);
    }
  }

  async function saveUpdatedSlots(slots: NonNullable<BrowserDeviceRecord["unlockSlots"]>) {
    await saveBrowserDeviceRecord({ ...record, schemaVersion: 2, unlockSlots: slots, updatedAt: new Date().toISOString() });
    window.location.reload();
  }

  async function addPasskeyUnlockSlot(confirmationSlotId: string, confirmationPassphrase: string) {
    setWorking(true); setError(null);
    let bundleKey: Uint8Array | null = null;
    let material: Uint8Array | null = null;
    try {
      bundleKey = await confirmBundleKey(confirmationSlotId, confirmationPassphrase);
      const credential = await createVaultPrfCredential(accountId);
      material = await getVaultPrfOutput(credential);
      const slot = { ...(await createUnlockSlot({ kind: "passkey", unlockMaterial: material, bundleKey, accountId, deviceId: record.deviceId })), webauthnCredentialId: credential.credentialId, webauthnRpId: credential.rpId, prfInput: credential.prfInput };
      await saveUpdatedSlots([...(record.unlockSlots ?? []), slot]);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not add the vault passkey.";
      setError(message); throw new Error(message);
    } finally {
      material?.fill(0); bundleKey?.fill(0); setWorking(false);
    }
  }

  async function addPassphraseUnlockSlot(confirmationSlotId: string, confirmationPassphrase: string, newPassphrase: string) {
    if (newPassphrase.length < 12) throw new Error("Use a new vault passphrase of at least 12 characters.");
    setWorking(true); setError(null);
    let bundleKey: Uint8Array | null = null;
    let material: Uint8Array | null = null;
    try {
      bundleKey = await confirmBundleKey(confirmationSlotId, confirmationPassphrase);
      const passphraseKdfSalt = randomBytes(16);
      material = await deriveVaultPassphraseKey(newPassphrase, passphraseKdfSalt);
      const slot = { ...(await createUnlockSlot({ kind: "passphrase", unlockMaterial: material, bundleKey, accountId, deviceId: record.deviceId })), passphraseKdfSalt };
      await saveUpdatedSlots([...(record.unlockSlots ?? []), slot]);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not add the vault passphrase.";
      setError(message); throw new Error(message);
    } finally {
      material?.fill(0); bundleKey?.fill(0); setWorking(false);
    }
  }

  async function removeVaultUnlockSlot(confirmationSlotId: string, confirmationPassphrase: string, slotId: string) {
    setWorking(true); setError(null);
    let bundleKey: Uint8Array | null = null;
    try {
      bundleKey = await confirmBundleKey(confirmationSlotId, confirmationPassphrase);
      await saveUpdatedSlots(removeUnlockSlot(record.unlockSlots ?? [], slotId));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not remove the vault unlock method.";
      setError(message); throw new Error(message);
    } finally {
      bundleKey?.fill(0); setWorking(false);
    }
  }

  if (unlocked) {
    const session: VaultSession = {
      email,
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
      addPasskeyUnlockSlot,
      addPassphraseUnlockSlot,
      removeUnlockSlot: removeVaultUnlockSlot,
      lock,
    };
    return <VaultSessionContext.Provider value={session}>{children}</VaultSessionContext.Provider>;
  }

  const selectedSlotKind = record.unlockSlots?.find((s) => s.id === selectedSlotId)?.kind ?? (record.protectionProfile === "webauthn-prf-wrapped" ? "passkey" : "passphrase");
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-16 sm:px-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-(--vault-border) bg-(--vault-surface) p-8 shadow-lg shadow-(--vault-accent)/5">
        <div className="text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-(--vault-accent-subtle) text-(--vault-accent) ring-1 ring-(--vault-accent)/20">
            <LockKeyhole size={24} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--vault-accent)">Encrypted vault</p>
          <h1 className="mt-1 font-heading text-2xl font-bold">Unlock your vault</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {selectedSlotKind === "passkey"
              ? "Confirm with the dedicated vault passkey on this browser."
              : "Enter this browser’s vault passphrase."}
          </p>
        </div>
        {(record.unlockSlots?.length ?? 0) > 1 && (
          <div className="flex gap-2">
            {record.unlockSlots!.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => { setSelectedSlotId(slot.id); setPassphrase(""); }}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${slot.id === selectedSlotId ? "bg-(--vault-accent) text-white" : "bg-(--vault-muted) text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"}`}
              >
                {slot.kind === "passkey" ? "Passkey" : "Passphrase"}
              </button>
            ))}
          </div>
        )}
        {selectedSlotKind === "passphrase" && (
          <label className="block text-sm font-medium">
            Vault passphrase
            <input
              type="password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void unlock(); }}
              className="input-vault mt-1.5"
              autoComplete="current-password"
              autoFocus
            />
          </label>
        )}
        {error && (
          <p
            role="alert"
            className="text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        )}
        <Button className="w-full" loading={working} onClick={unlock}>
          Unlock vault
        </Button>
      </div>
    </div>
  );
}

// ─── Shared UI helpers ───────────────────────────────────────────────────────

function VaultLoadingCard() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-(--vault-border) bg-(--vault-surface) px-10 py-10 shadow-lg">
        <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-(--vault-accent-subtle)">
          <LockKeyhole size={24} className="text-(--vault-accent) animate-pulse" />
        </div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Checking vault device…</p>
        <div className="flex gap-1.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--vault-accent) [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--vault-accent) [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-(--vault-accent) [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

function EnrollmentErrorCard({
  variant,
  heading,
  description,
  error,
  action,
}: {
  variant: "error" | "warning";
  heading: string;
  description: string;
  error?: string | null;
  action: ReactNode;
}) {
  const isError = variant === "error";
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-16 sm:px-6">
      <div className="w-full max-w-lg space-y-5 rounded-2xl border border-(--vault-border) bg-(--vault-surface) p-8 shadow-lg">
        <div className="flex items-center gap-3">
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1 ${isError ? "bg-red-500/10 text-red-600 ring-red-500/20 dark:text-red-400" : "bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400"}`}>
            {isError ? <ShieldOff size={20} /> : <AlertTriangle size={20} />}
          </div>
          <h1 className="font-heading text-xl font-bold">{heading}</h1>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {action}
      </div>
    </div>
  );
}

function UnlockMethodCards({
  profile,
  setProfile,
  prfSupported,
  passphrase,
  setPassphrase,
  passphraseLabel = "Vault passphrase",
  passphraseAutoComplete = "current-password",
}: {
  profile: Profile;
  setProfile: (p: Profile) => void;
  prfSupported: boolean | null;
  passphrase: string;
  setPassphrase: (v: string) => void;
  passphraseLabel?: string;
  passphraseAutoComplete?: string;
}) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={prfSupported === false}
        onClick={() => setProfile("webauthn-prf-wrapped")}
        className={`w-full rounded-xl border p-4 text-left transition-colors ${profile === "webauthn-prf-wrapped" ? "border-(--vault-accent) bg-(--vault-accent-subtle) ring-1 ring-(--vault-accent)/30" : "border-(--vault-border) hover:border-(--vault-accent)/40"} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <p className="font-semibold text-sm">Passkey <span className="ml-1.5 rounded-full bg-(--vault-accent-subtle) px-2 py-0.5 text-xs font-medium text-(--vault-accent)">Recommended</span></p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {prfSupported === false ? "Passkey PRF is unavailable in this browser." : "User-verified passkey protects the local bundle."}
        </p>
      </button>
      <button
        type="button"
        onClick={() => setProfile("vault-passphrase-wrapped")}
        className={`w-full rounded-xl border p-4 text-left transition-colors ${profile === "vault-passphrase-wrapped" ? "border-(--vault-accent) bg-(--vault-accent-subtle) ring-1 ring-(--vault-accent)/30" : "border-(--vault-border) hover:border-(--vault-accent)/40"}`}
      >
        <p className="font-semibold text-sm">Vault passphrase</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Use when this browser cannot create a PRF passkey.</p>
      </button>
      {profile === "vault-passphrase-wrapped" && (
        <label className="block text-sm font-medium">
          {passphraseLabel}
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            className="input-vault mt-1.5"
            placeholder="At least 12 characters"
            autoComplete={passphraseAutoComplete}
            autoFocus
          />
          {passphrase.length > 0 && (
            <PassphraseStrength passphrase={passphrase} />
          )}
        </label>
      )}
    </div>
  );
}

function PassphraseStrength({ passphrase }: { passphrase: string }) {
  const len = passphrase.length;
  const strength = len < 12 ? 0 : len < 16 ? 1 : len < 24 ? 2 : 3;
  const labels = ["Too short", "Fair", "Good", "Strong"];
  const colors = ["bg-red-500", "bg-amber-400", "bg-cyan-400", "bg-emerald-500"];
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? colors[strength] : "bg-gray-200 dark:bg-white/10"}`} />
        ))}
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400">{labels[strength]}</span>
    </div>
  );
}

function CreateVaultScreen({
  phrase,
  profile,
  setProfile,
  passphrase,
  setPassphrase,
  prfSupported,
  error,
  working,
  onEnroll,
}: {
  phrase?: string;
  profile: Profile;
  setProfile: (p: Profile) => void;
  passphrase: string;
  setPassphrase: (v: string) => void;
  prfSupported: boolean | null;
  error: string | null;
  working: boolean;
  onEnroll: () => void;
}) {
  const [phraseConfirmed, setPhraseConfirmed] = useState(false);
  const words = phrase?.split(" ") ?? [];

  return (
    <div className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--vault-accent)">Encrypted vault</p>
          <h1 className="mt-2 font-heading text-3xl font-black">Create your vault</h1>
          <p className="mt-3 text-gray-600 dark:text-gray-300">
            Your account signs in; this separate setup creates the keys that decrypt your vault.
          </p>
        </div>

        <section className="rounded-xl border border-amber-400/50 bg-amber-50 p-6 dark:bg-amber-500/10">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-heading text-xl font-bold">Save your 24-word recovery phrase</h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void navigator.clipboard.writeText(phrase ?? "")}
            >
              <Copy size={14} /> Copy
            </Button>
          </div>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
            Write it down offline. It is your only guaranteed recovery path and is never stored in this browser bundle or sent to the server.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-white p-4 dark:bg-gray-900">
            {words.map((word, index) => (
              <div key={word} className="flex items-center gap-1.5 rounded-lg border border-(--vault-border) px-2 py-1.5 font-mono text-sm">
                <span className="w-5 text-right text-xs text-gray-400 dark:text-gray-500">{index + 1}.</span>
                <span>{word}</span>
              </div>
            ))}
          </div>
          <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm font-medium">
            <input
              type="checkbox"
              checked={phraseConfirmed}
              onChange={(e) => setPhraseConfirmed(e.target.checked)}
              className="h-4 w-4 rounded border border-(--vault-border) checked:accent-cyan-600 cursor-pointer"
            />
            I have written down my recovery phrase in a safe place.
          </label>
        </section>

        <section className="rounded-xl border border-(--vault-border) p-6">
          <h2 className="font-heading text-xl font-bold">Protect this browser</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Choose how to unlock the vault on this browser.</p>
          <div className="mt-5">
            <UnlockMethodCards
              profile={profile}
              setProfile={setProfile}
              prfSupported={prfSupported}
              passphrase={passphrase}
              setPassphrase={setPassphrase}
              passphraseLabel="New vault passphrase"
              passphraseAutoComplete="new-password"
            />
          </div>
        </section>

        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button
          loading={working}
          disabled={!phraseConfirmed}
          onClick={onEnroll}
          className="w-full sm:w-auto"
          onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter") onEnroll(); }}
        >
          {working ? "Creating vault…" : "Create encrypted vault"}
        </Button>
      </div>
    </div>
  );
}
