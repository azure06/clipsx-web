import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { IconLab } from "@/components/brand/IconLab";

export const metadata: Metadata = {
  title: "Identity studio",
  description: "Compare ClipsX identity directions in real interface contexts.",
  robots: { index: false, follow: false },
};

export default async function IdentityStudioPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <IconLab />;
}
