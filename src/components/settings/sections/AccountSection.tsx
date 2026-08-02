"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsAction } from "@/components/settings/SettingsAction";
import type { SectionProps } from "@/components/settings/SettingsRegistry";
import { User, CreditCard, LogOut, Trash2, Mail, Shield, MonitorSmartphone } from "lucide-react";

type BillingSummary = {
  name: string;
  canManageBilling: boolean;
  planCode: "free" | "pro";
  entitlementStatus: "active" | "read_only";
  paidThrough: string | null;
  cancelAtPeriodEnd: boolean;
};

type Workspace = {
  id: string;
  name: string;
  kind: "personal" | "organization";
  canManageBilling: boolean;
};

export default function AccountSection({ session: _session }: SectionProps) {
  const t = useTranslations("AccountPage");
  const router = useRouter();
  const [billingLoading, setBillingLoading] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string>("personal");

  useEffect(() => {
    fetch("/api/billing/workspaces")
      .then(async (r) => (r.ok ? r.json() : []))
      .then((value: Workspace[]) => {
        setWorkspaces(value);
        const personal = value.find((w) => w.kind === "personal");
        if (personal) setWorkspaceId(personal.id);
      })
      .catch(() => setWorkspaces([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/billing/summary?workspace=${encodeURIComponent(workspaceId)}`)
      .then(async (r) => (r.ok ? (r.json() as Promise<BillingSummary>) : null))
      .then((value) => { if (!cancelled) setSummary(value); })
      .catch(() => { if (!cancelled) setSummary(null); });
    return () => { cancelled = true; };
  }, [workspaceId]);

  async function handleManageBilling() {
    setBillingLoading(true);
    const res = await fetch("/api/stripe/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: workspaceId === "personal" ? undefined : workspaceId }),
    });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
      return;
    }
    setBillingLoading(false);
  }

  async function handleSignOut() {
    setSignOutLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const plan = summary?.planCode ?? "free";

  return (
    <div className="space-y-6">
      {/* Profile */}
      <SettingsSection title="Profile" icon={User}>
        <SettingsAction
          label="Display name"
          comingSoon
          reason="Profile editing will be available in a future update."
        >
          <input disabled className="input-vault w-full opacity-50" placeholder="—" />
        </SettingsAction>
        <SettingsAction
          label={t("email_label")}
          description="Your account email address. Contact support to change it."
        >
          <div className="flex items-center gap-2 rounded-lg border border-(--vault-border) bg-(--vault-muted) px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
            <Mail size={14} className="shrink-0" />
            <span className="truncate">{/* filled by parent */}</span>
          </div>
        </SettingsAction>
        <SettingsAction
          label="Username"
          comingSoon
          reason="Username support is not yet available."
        >
          <input disabled className="input-vault w-full opacity-50" placeholder="—" />
        </SettingsAction>
      </SettingsSection>

      {/* Password */}
      <SettingsSection title="Password" icon={Shield}>
        <SettingsAction
          label="Change password"
          comingSoon
          reason="Password change via settings is coming in a future update."
        >
          <Button variant="secondary" size="sm" disabled>Change password</Button>
        </SettingsAction>
      </SettingsSection>

      {/* Billing */}
      <SettingsSection title="Billing" icon={CreditCard}>
        {workspaces.length > 0 && (
          <SettingsAction label="Workspace">
            <select
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className="input-vault w-full"
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </SettingsAction>
        )}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{t("plan_label")}</p>
            <Badge variant={plan === "free" ? "default" : "cyan"}>{t(`plan_${plan}` as never)}</Badge>
            {summary?.entitlementStatus === "read_only" && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Read-only access</p>
            )}
            {summary?.cancelAtPeriodEnd && summary.paidThrough && (
              <p className="mt-1 text-xs text-gray-500">
                Active until {new Date(summary.paidThrough).toLocaleDateString()}
              </p>
            )}
          </div>
          {plan === "free" && workspaceId === "personal" ? (
            <Button variant="outline" size="sm" onClick={() => router.push("/pricing")}>
              {t("upgrade")}
            </Button>
          ) : summary?.canManageBilling !== false ? (
            <Button variant="outline" size="sm" loading={billingLoading} onClick={handleManageBilling}>
              {t("manage_billing")}
            </Button>
          ) : null}
        </div>
      </SettingsSection>

      {/* Sessions */}
      <SettingsSection title="Active sessions" icon={MonitorSmartphone}>
        <SettingsAction
          label="View and revoke active sessions"
          comingSoon
          reason="Session management is not yet implemented."
        >
          <Button variant="secondary" size="sm" disabled>View sessions</Button>
        </SettingsAction>
      </SettingsSection>

      {/* Danger zone */}
      <SettingsSection title="Danger zone" danger>
        <SettingsAction
          label="Delete account"
          comingSoon
          reason="Account deletion requires a complete offboarding flow that is not yet implemented."
        >
          <Button variant="danger" size="sm" disabled>
            <Trash2 size={14} /> Delete account
          </Button>
        </SettingsAction>
        <div className="border-t border-red-300/30 pt-4">
          <Button
            variant="ghost"
            size="sm"
            loading={signOutLoading}
            onClick={handleSignOut}
            className="text-red-500 hover:text-red-600"
          >
            <LogOut size={14} /> {t("sign_out")}
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}
