import { redirect } from "next/navigation";

import { getUser } from "@/lib/supabase/server";
import { VaultOnboardingClient } from "./VaultOnboardingClient";

export default async function VaultLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getUser();
  if (!user) redirect(`/${locale}/signin`);

  return <VaultOnboardingClient accountId={user.id} email={user.email ?? ""}>{children}</VaultOnboardingClient>;
}
