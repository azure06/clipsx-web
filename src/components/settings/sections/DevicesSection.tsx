"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2, ClipboardPaste, Monitor, ShieldCheck, Smartphone, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/Dialog";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsAction } from "@/components/settings/SettingsAction";
import type { SectionProps } from "@/components/settings/SettingsRegistry";
import {
  forgetBrowserDeviceRecord,
  listBrowserDeviceRecords,
  type BrowserDeviceRecord,
} from "@/lib/vault/browser-device-store";

export default function DevicesSection({ session }: SectionProps) {
  const [devices, setDevices] = useState<BrowserDeviceRecord[]>([]);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);

  const [offer, setOffer] = useState("");
  const [approval, setApproval] = useState<{ command: Uint8Array; sas: string; deviceId: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [approvalReceipt, setApprovalReceipt] = useState<string | null>(null);

  const working = session?.working ?? false;
  const error = session?.error ?? null;

  useEffect(() => {
    if (!session) return;
    void listBrowserDeviceRecords(session.record.accountId).then(setDevices).catch(() => undefined);
  }, [session]);

  async function removeDevice(deviceId: string) {
    if (!session) return;
    await forgetBrowserDeviceRecord(session.record.accountId, deviceId);
    setDevices((prev) => prev.filter((d) => d.deviceId !== deviceId));
    setRemoveConfirmId(null);
  }

  async function review() {
    if (!session) return;
    try {
      setApproval(await session.reviewDeviceApproval(offer));
      setConfirmed(false);
    } catch { /* error shown via session.error */ }
  }

  async function approve() {
    if (!approval || !confirmed || !session) return;
    try {
      await session.approveDevice(approval.command);
      setOffer("");
      setApproval(null);
      setConfirmed(false);
      setApprovalReceipt(`Browser ${approval.deviceId.slice(0, 8)} was approved.`);
    } catch { /* error shown via session.error */ }
  }

  if (!session) {
    return (
      <div className="rounded-xl border border-(--vault-border) p-6 text-sm text-gray-500 dark:text-gray-400">
        Open your vault to manage enrolled browsers.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enrolled browsers — functional */}
      <SettingsSection
        title="Enrolled browsers"
        description="Browsers that hold a local copy of the encrypted vault bundle. Removing a record clears the local data only — it does not revoke server-side access."
        icon={Smartphone}
      >
        <div className="space-y-2">
          {devices.map((device) => {
            const isCurrent = device.deviceId === session.record.deviceId;
            return (
              <div
                key={device.deviceId}
                className="flex items-center gap-3 rounded-xl border border-(--vault-border) px-4 py-3"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-(--vault-muted) text-gray-500">
                  <Monitor size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-semibold">{device.deviceId.slice(0, 14)}…</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Enrolled {new Date(device.createdAt).toLocaleDateString()}
                    {isCurrent && (
                      <span className="ml-2 rounded-full bg-(--vault-accent-subtle) px-1.5 py-0.5 text-[10px] font-bold text-(--vault-accent)">
                        This browser
                      </span>
                    )}
                  </p>
                </div>
                {!isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-red-500 hover:text-red-600"
                    onClick={() => setRemoveConfirmId(device.deviceId)}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            );
          })}
          {devices.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No device records found in this browser.
            </p>
          )}
        </div>
      </SettingsSection>

      {/* Approve another browser — functional */}
      <SettingsSection
        title="Approve another browser"
        description="On the new browser, navigate to your vault and copy the approval offer. Paste it here, then compare the security code on both devices."
        icon={ShieldCheck}
      >
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Approval payload
          <textarea
            value={offer}
            onChange={(e) => { session.clearError(); setOffer(e.target.value); setApproval(null); }}
            className="input-vault mt-1.5 min-h-24 font-mono text-xs"
            placeholder="Paste the approval offer payload here"
          />
        </label>

        {error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {approvalReceipt && (
          <p role="status" className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">
            {approvalReceipt}
          </p>
        )}

        {!approval ? (
          <Button className="mt-3" loading={working} disabled={!offer.trim()} onClick={() => void review()}>
            <ClipboardPaste size={16} /> Verify payload
          </Button>
        ) : (
          <div className="mt-4 space-y-3 rounded-xl border border-(--vault-accent)/30 bg-(--vault-accent-subtle) p-4">
            <p className="text-sm font-semibold">Compare this code on both browsers</p>
            <p className="font-mono text-2xl font-bold tracking-wider text-(--vault-accent)">{approval.sas}</p>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 cursor-pointer rounded checked:accent-cyan-600"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span>The codes match on both devices.</span>
            </label>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setApproval(null); setConfirmed(false); }}>
                Cancel
              </Button>
              <Button size="sm" loading={working} disabled={!confirmed} onClick={() => void approve()}>
                <CheckCircle2 size={15} /> Approve browser
              </Button>
            </div>
          </div>
        )}
      </SettingsSection>

      {/* Planned features */}
      <SettingsSection title="Advanced device management" icon={Monitor}>
        <SettingsAction
          label="Remote revocation"
          comingSoon
          reason="Server-side device revocation requires additional API work that is not yet implemented."
        >
          <Button variant="secondary" size="sm" disabled>Revoke a device</Button>
        </SettingsAction>
        <SettingsAction
          label="Device fingerprints"
          comingSoon
          reason="Device fingerprint display is planned for a future release."
        >
          <Button variant="secondary" size="sm" disabled>View fingerprints</Button>
        </SettingsAction>
        <SettingsAction
          label="Activity history"
          comingSoon
          reason="Activity logging is not yet implemented."
        >
          <Button variant="secondary" size="sm" disabled>View activity</Button>
        </SettingsAction>
      </SettingsSection>

      <Dialog open={removeConfirmId !== null} onClose={() => setRemoveConfirmId(null)}>
        <DialogBody>
          <DialogTitle>Remove browser record</DialogTitle>
          <DialogDescription>
            This removes the local vault bundle for device{" "}
            <strong className="font-mono">{removeConfirmId?.slice(0, 14)}…</strong>. The device will
            need to re-enroll to access the vault again.
          </DialogDescription>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setRemoveConfirmId(null)}>Cancel</Button>
          <Button
            variant="danger"
            onClick={() => void (removeConfirmId && removeDevice(removeConfirmId))}
          >
            Remove
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
