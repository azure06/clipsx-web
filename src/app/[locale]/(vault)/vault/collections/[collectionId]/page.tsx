import { assertLocale } from '@/i18n/validate';
import { VaultCollectionWorkspaceClient } from "./VaultCollectionWorkspaceClient";

export default async function VaultCollectionPage({ params }: { params: Promise<{ locale: string; collectionId: string }> }) {
  const { locale, collectionId } = await params;
  assertLocale(locale);
  return <VaultCollectionWorkspaceClient collectionId={collectionId} />;
}
