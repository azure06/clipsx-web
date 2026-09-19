"use client";

import { Camera, Globe2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { SettingsAction } from "@/components/settings/SettingsAction";
import { SettingsSection } from "@/components/settings/SettingsSection";

export default function ProfileSection() {
  return (
    <div className="space-y-6">
      <SettingsSection
        title="Public profile"
        description="How you appear to people you share vault content with."
        icon={UserRound}
      >
        <SettingsAction
          label="Profile photo"
          comingSoon
          reason="Profile photos are not stored yet."
        >
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-(--vault-muted) text-gray-500">
              <UserRound size={20} />
            </div>
            <Button variant="secondary" size="sm" disabled><Camera size={14} /> Upload photo</Button>
          </div>
        </SettingsAction>

        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsAction label="Display name" comingSoon reason="Profile editing is not implemented yet.">
            <input className="input-vault w-full" placeholder="Your name" disabled />
          </SettingsAction>
          <SettingsAction label="Username" comingSoon reason="Public usernames are not implemented yet.">
            <input className="input-vault w-full" placeholder="username" disabled />
          </SettingsAction>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Regional preferences"
        description="Defaults used for dates, times, and interface text."
        icon={Globe2}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsAction comingSoon reason="Language preferences are not implemented yet.">
            <Select label="Language" value="en" disabled>
              <option value="en">English</option>
            </Select>
          </SettingsAction>
          <SettingsAction comingSoon reason="Time zone preferences are not implemented yet.">
            <Select label="Time zone" value="system" disabled>
              <option value="system">Use system time zone</option>
            </Select>
          </SettingsAction>
        </div>
      </SettingsSection>
    </div>
  );
}
