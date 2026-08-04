"use client";

import { useMemo, useState } from "react";
import { LifeBuoy, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsAction } from "@/components/settings/SettingsAction";
import type { SectionProps } from "@/components/settings/SettingsRegistry";
import {
  createBrowserDeviceIdentity,
  encodeBrowserDeviceBundle,
  deriveRecoveryIdentity,
} from "@/lib/vault/browser-onboarding";
import {
  forgetBrowserDeviceRecord,
  saveBrowserDeviceRecord,
} from "@/lib/vault/browser-device-store";
import { createUnlockSlot, encryptBundle } from "@/lib/vault/browser-unlock-slots";
import { createPendingDeviceRegistrationCommand } from "@/lib/vault/browser-device-approval";
import { decodeDeviceRegistrationChallenge } from "@/lib/vault/browser-registration";
import { createRecoveryDeviceAuthorizationCommand } from "@/lib/vault/browser-recovery-enrollment";
import {
  deriveVaultPassphraseKey,
  encodeCanonicalCbor,
  importHpkePrivateKey,
  openHpke,
  randomBytes,
  utf8,
} from "@/lib/vault/protocol";
import {
  readVaultCborResponse,
  readVaultCborResponseBytes,
  vaultErrorMessage,
  VaultHttpError,
} from "@/lib/vault/http";
import {
  createVaultPrfCredential,
  currentVaultEnrollmentOrigin,
  getVaultPrfOutput,
} from "@/lib/vault/webauthn-prf";

type RecoveryStep = "idle" | "phrase" | "protect" | "authorizing" | "done";
type Profile = "webauthn-prf-wrapped" | "vault-passphrase-wrapped";

function body(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

export default function RecoverySection({ session }: SectionProps) {
  const accountId = session?.record.accountId ?? "";

  const [step, setStep] = useState<RecoveryStep>("idle");
  const [phrase, setPhrase] = useState("");
  const [phraseError, setPhraseError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>("webauthn-prf-wrapped");
  const [passphrase, setPassphrase] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const identity = useMemo(() => createBrowserDeviceIdentity(), []);
  const deviceId = useMemo(() => crypto.randomUUID(), []);
  const sasSecret = useMemo(() => randomBytes(32), []);

  function reset() {
    setStep("idle");
    setPhrase("");
    setPhraseError(null);
    setPassphrase("");
    setWorking(false);
    setError(null);
  }

  async function verifyPhrase() {
    setPhraseError(null);
    const words = phrase.trim().split(/\s+/);
    if (words.length !== 24) {
      setPhraseError("Enter all 24 words of your recovery phrase.");
      return;
    }
    // Phrase word-count is the only client-side validation;
    // the server will reject mismatched keys at authorization time.
    setStep("protect");
  }

  async function executeRecovery() {
    if (!accountId) { setError("Account session unavailable."); return; }
    setWorking(true);
    setError(null);
    let unlock: Uint8Array | null = null;
    let staged = false;
    let accepted = false;
    try {
      // Derive recovery identity from phrase
      const recoveryIdentity = await deriveRecoveryIdentity(accountId, phrase.trim());

      const enrollmentOrigin = currentVaultEnrollmentOrigin();
      let passphraseKdfSalt: Uint8Array | undefined;
      let webauthnCredentialId: Uint8Array | undefined;
      let webauthnRpId: string | undefined;
      let prfInput: Uint8Array | undefined;

      if (profile === "webauthn-prf-wrapped") {
        const credential = await createVaultPrfCredential(accountId);
        unlock = await getVaultPrfOutput(credential);
        webauthnCredentialId = credential.credentialId;
        webauthnRpId = credential.rpId;
        prfInput = credential.prfInput;
      } else {
        if (passphrase.length < 12) throw new Error("Use a vault passphrase of at least 12 characters.");
        passphraseKdfSalt = randomBytes(16);
        unlock = await deriveVaultPassphraseKey(passphrase, passphraseKdfSalt);
      }

      // Register new pending device
      const challengeRequest = encodeCanonicalCbor(new Map<number, number | Uint8Array>([[1, 1], [2, identity.deviceEncryption.publicKey]]));
      const challengeResponse = await fetch("/api/vault/device-challenges", {
        method: "POST",
        headers: { "Content-Type": "application/cbor" },
        body: body(challengeRequest),
      });
      const challengeBytes = await readVaultCborResponseBytes(challengeResponse, "Could not start device registration.");
      const challenge = decodeDeviceRegistrationChallenge(challengeBytes.bytes);

      const pending = await createPendingDeviceRegistrationCommand({
        accountId, deviceId, displayName: "Recovery browser",
        platform: navigator.platform || "browser",
        enrollmentOrigin, protectionProfile: profile,
        capabilities: encodeCanonicalCbor(new Map<number, number | string>([[1, 1], [2, "browser"]])),
        challenge,
        deviceEncryptionPublicKey: identity.deviceEncryption.publicKey,
        deviceEncryptionSecretKey: identity.deviceEncryption.secretKey,
        deviceSigningPublicKey: identity.deviceSigning.publicKey,
        deviceSigningSecretKey: identity.deviceSigning.secretKey,
        sasSecret,
      });

      const wrapped = await encryptBundle(encodeBrowserDeviceBundle(identity), accountId, deviceId);
      const slot = {
        ...(await createUnlockSlot({
          kind: profile === "webauthn-prf-wrapped" ? "passkey" : "passphrase",
          unlockMaterial: unlock,
          bundleKey: wrapped.bundleKey,
          accountId,
          deviceId,
        })),
        passphraseKdfSalt, webauthnCredentialId, webauthnRpId, prfInput,
      };
      wrapped.bundleKey.fill(0);

      const now = new Date().toISOString();
      await saveBrowserDeviceRecord({
        accountId, deviceId, schemaVersion: 2, protectionProfile: profile,
        enrollmentStatus: "pending",
        encryptedBundle: wrapped.encryptedBundle.ciphertext,
        bundleNonce: wrapped.encryptedBundle.nonce,
        bundleSalt: slot.salt,
        unlockSlots: [slot],
        passphraseKdfSalt, webauthnCredentialId, webauthnRpId, prfInput,
        createdAt: now, updatedAt: now,
      });
      staged = true;

      const pendingResponse = await fetch("/api/vault/commands", {
        method: "POST",
        headers: { "Content-Type": "application/cbor" },
        body: body(pending.command),
      });
      await readVaultCborResponse(pendingResponse, "Pending device registration was rejected.");
      accepted = true;

      setStep("authorizing");

      // Fetch recovery bootstrap data
      const bootstrapResponse = await fetch("/api/vault/recovery-bootstrap", { cache: "no-store" });
      const bootstrap = await readVaultCborResponse(bootstrapResponse, "Could not load recovery data.");

      const recoveryKeyId = bootstrap.get(2);
      const accountHead = bootstrap.get(3);
      const rawEnvelopes = bootstrap.get(4);
      if (typeof recoveryKeyId !== "string" || !(accountHead instanceof Uint8Array) || !Array.isArray(rawEnvelopes)) {
        throw new Error("Invalid recovery bootstrap response.");
      }

      // Decrypt each recovery epoch envelope to get the epoch keys
      const privateKey = await importHpkePrivateKey(recoveryIdentity.recoveryEncryption.secretKey);
      const epochs: Array<{ collectionId: string; epochNumber: number; key: Uint8Array }> = [];
      for (const raw of rawEnvelopes) {
        if (!(raw instanceof Map)) continue;
        const collectionId = raw.get(1);
        const epochNumber = raw.get(2);
        const encapsulation = raw.get(3);
        const ciphertext = raw.get(4);
        if (typeof collectionId !== "string" || typeof epochNumber !== "number" || !(encapsulation instanceof Uint8Array) || !(ciphertext instanceof Uint8Array)) continue;
        const epochKey = await openHpke(
          privateKey,
          { enc: encapsulation, ciphertext },
          utf8(`clipsx/vault/v1/epoch-envelope\0${collectionId}\0${epochNumber}\0recovery\0${recoveryKeyId}`),
        );
        epochs.push({ collectionId, epochNumber, key: epochKey });
      }

      // Build and submit the recovery-signed device authorization
      const { command } = await createRecoveryDeviceAuthorizationCommand({
        accountId,
        recoveryKeyId,
        recoverySigningSecretKey: recoveryIdentity.recoverySigning.secretKey,
        expectedAccountHead: accountHead,
        offer: pending.offer,
        epochs,
      });

      // Wipe epoch keys from memory
      for (const epoch of epochs) epoch.key.fill(0);

      const authResponse = await fetch("/api/vault/commands", {
        method: "POST",
        headers: { "Content-Type": "application/cbor" },
        body: body(command),
      });
      await readVaultCborResponse(authResponse, "Recovery authorization was rejected.");

      // Activate the device record locally
      await saveBrowserDeviceRecord({
        accountId, deviceId, schemaVersion: 2, protectionProfile: profile,
        enrollmentStatus: "active",
        encryptedBundle: wrapped.encryptedBundle.ciphertext,
        bundleNonce: wrapped.encryptedBundle.nonce,
        bundleSalt: slot.salt,
        unlockSlots: [slot],
        passphraseKdfSalt, webauthnCredentialId, webauthnRpId, prfInput,
        createdAt: now, updatedAt: now,
      });

      setStep("done");
    } catch (caught) {
      if (staged && !accepted && caught instanceof VaultHttpError
        && caught.category !== "network" && caught.category !== "service") {
        await forgetBrowserDeviceRecord(accountId, deviceId).catch(() => undefined);
      }
      setStep(step === "authorizing" ? "authorizing" : "protect");
      setError(vaultErrorMessage(caught, "Recovery failed."));
    } finally {
      unlock?.fill(0);
      setWorking(false);
    }
  }

  if (step === "done") {
    return (
      <div className="space-y-6">
        <SettingsSection title="Recovery complete" icon={ShieldCheck}>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 space-y-2">
            <p className="font-semibold">This browser has been enrolled using your recovery phrase.</p>
            <p>Reload the vault to unlock with your new credentials. Your old devices remain registered — revoke any you no longer have access to from the Devices panel.</p>
          </div>
          <Button variant="secondary" onClick={() => window.location.reload()}>Reload vault</Button>
        </SettingsSection>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Explanation */}
      <SettingsSection title="Recovery phrase" icon={LifeBuoy}>
        <div className="rounded-xl border border-amber-400/40 bg-amber-50 p-4 text-sm text-gray-700 dark:bg-amber-500/10 dark:text-gray-200 space-y-2">
          <p>
            Your recovery phrase is a one-time secret generated during vault setup. It was shown only once and cannot be displayed again.
          </p>
          <p>
            Keep an offline copy in a secure location. It is the only way to recover your vault if all enrolled browsers and unlock methods are lost.
          </p>
        </div>
      </SettingsSection>

      {/* Recovery execution */}
      <SettingsSection title="Recover a lost vault" icon={RotateCcw}>
        {step === "idle" && (
          <SettingsAction
            label="Use recovery phrase"
            description="Authorize this browser as a replacement device using your offline recovery phrase. Use this only if you have lost all other enrolled browsers."
          >
            <Button variant="secondary" size="sm" onClick={() => setStep("phrase")}>
              Start device recovery
            </Button>
          </SettingsAction>
        )}

        {step === "phrase" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enter all 24 words of your recovery phrase, separated by spaces. The phrase never leaves this browser.
            </p>
            <label className="block text-sm font-medium">
              Recovery phrase
              <textarea
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                rows={4}
                className="input-vault mt-1.5 font-mono text-sm leading-6"
                placeholder="word1 word2 word3 … word24"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            {phraseError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{phraseError}</p>}
            <div className="flex gap-3">
              <Button onClick={() => void verifyPhrase()}>Continue</Button>
              <Button variant="ghost" onClick={reset}>Cancel</Button>
            </div>
          </div>
        )}

        {(step === "protect" || step === "authorizing") && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose how to protect the new device key bundle on this browser.
            </p>
            <div className="space-y-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-(--vault-border) p-4 has-[:checked]:border-(--vault-accent)/60 has-[:checked]:bg-(--vault-accent-subtle)">
                <input
                  type="radio"
                  name="recovery-profile"
                  value="webauthn-prf-wrapped"
                  checked={profile === "webauthn-prf-wrapped"}
                  onChange={() => setProfile("webauthn-prf-wrapped")}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium">Passkey (recommended)</span>
                  <span className="block text-xs text-gray-500">Uses biometrics or a hardware key. No passphrase to forget.</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-(--vault-border) p-4 has-[:checked]:border-(--vault-accent)/60 has-[:checked]:bg-(--vault-accent-subtle)">
                <input
                  type="radio"
                  name="recovery-profile"
                  value="vault-passphrase-wrapped"
                  checked={profile === "vault-passphrase-wrapped"}
                  onChange={() => setProfile("vault-passphrase-wrapped")}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium">Passphrase</span>
                  <span className="block text-xs text-gray-500">A long secret phrase that only you know. At least 12 characters.</span>
                </span>
              </label>
            </div>
            {profile === "vault-passphrase-wrapped" && (
              <label className="block text-sm font-medium">
                New vault passphrase
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="input-vault mt-1.5"
                  autoComplete="new-password"
                  minLength={12}
                />
              </label>
            )}
            {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {step === "authorizing" && (
              <p className="text-sm text-sky-700 dark:text-sky-300">Authorizing replacement device via recovery phrase…</p>
            )}
            <div className="flex gap-3">
              <Button loading={working} onClick={() => void executeRecovery()}>
                Enroll replacement device
              </Button>
              <Button variant="ghost" onClick={reset} disabled={working}>Cancel</Button>
            </div>
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
