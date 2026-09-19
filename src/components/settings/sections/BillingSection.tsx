"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { SettingsSection } from "@/components/settings/SettingsSection";

type BillingSummary = {
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

export default function BillingSection() {
  const t = useTranslations("AccountPage");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [billingLoading, setBillingLoading] = useState(false);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState("personal");
  const [activating, setActivating] = useState(searchParams.get("checkout") === "success");

  useEffect(() => {
    fetch("/api/billing/workspaces")
      .then(async (response) => response.ok ? response.json() : [])
      .then((value: Workspace[]) => {
        setWorkspaces(value);
        const personal = value.find((workspace) => workspace.kind === "personal");
        if (personal) setWorkspaceId(personal.id);
      })
      .catch(() => setWorkspaces([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    const load = async () => {
      const response = await fetch(`/api/billing/summary?workspace=${encodeURIComponent(workspaceId)}`);
      const value = response.ok ? await response.json() as BillingSummary : null;
      if (cancelled) return;
      setSummary(value);
      if (activating && value?.planCode !== "pro" && attempt++ < 14) {
        window.setTimeout(load, 2000);
      } else if (value?.planCode === "pro") {
        setActivating(false);
      }
    };
    void load().catch(() => setSummary(null));
    return () => { cancelled = true; };
  }, [workspaceId, activating]);

  async function handleManageBilling() {
    setBillingLoading(true);
    const response = await fetch("/api/stripe/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    });
    if (response.ok) {
      const { url } = await response.json();
      window.location.href = url;
      return;
    }
    setBillingLoading(false);
  }

  const plan = summary?.planCode ?? "free";
  const selectedWorkspace = workspaces.find((workspace) => workspace.id === workspaceId);

  return (
    <SettingsSection title={t("plan_label")}>
      {workspaces.length > 0 && (
        <Select
          id="billing-workspace"
          label="Workspace"
          value={workspaceId}
          onChange={(event) => setWorkspaceId(event.target.value)}
        >
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
          ))}
        </Select>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge variant={plan === "free" ? "default" : "cyan"}>{t(`plan_${plan}` as never)}</Badge>
          {activating && plan === "free" && (
            <p className="mt-2 text-xs text-violet-300">Activating Pro…</p>
          )}
          {summary?.entitlementStatus === "read_only" && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Read-only access</p>
          )}
          {summary?.cancelAtPeriodEnd && summary.paidThrough && (
            <p className="mt-2 text-xs text-gray-500">Active until {new Date(summary.paidThrough).toLocaleDateString()}</p>
          )}
        </div>

        {plan === "free" && selectedWorkspace?.kind === "personal" ? (
          <Button variant="outline" size="sm" onClick={() => router.push("/pricing")}>{t("upgrade")}</Button>
        ) : summary?.canManageBilling !== false ? (
          <Button variant="outline" size="sm" loading={billingLoading} onClick={handleManageBilling}>{t("manage_billing")}</Button>
        ) : null}
      </div>
    </SettingsSection>
  );
}
