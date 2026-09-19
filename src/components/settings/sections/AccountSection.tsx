"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { SettingsAction } from "@/components/settings/SettingsAction";
import { User, LogOut, Trash2, Mail, Shield, MonitorSmartphone } from "lucide-react";

export default function AccountSection() {
  const t = useTranslations("AccountPage");
  const router = useRouter();
  const [signOutLoading, setSignOutLoading] = useState(false);

  async function handleSignOut() {
    setSignOutLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

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
