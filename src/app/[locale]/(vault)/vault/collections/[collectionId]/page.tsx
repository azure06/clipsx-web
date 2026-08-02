import { VaultCollectionWorkspaceClient } from "./VaultCollectionWorkspaceClient";

export default async function VaultCollectionPage({ params }: { params: Promise<{ collectionId: string }> }) {
  const { collectionId } = await params;
  return <VaultCollectionWorkspaceClient collectionId={collectionId} />;
}
