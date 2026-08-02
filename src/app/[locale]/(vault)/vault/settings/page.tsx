import { Suspense } from "react";
import { VaultSettingsPageClient } from "./VaultSettingsPageClient";

export default function VaultSettingsPage() {
  return (
    <Suspense>
      <VaultSettingsPageClient />
    </Suspense>
  );
}
