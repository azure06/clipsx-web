export type VaultFormat = {
  mediaType: string;
  label: string;
  editableAsText: boolean;
  supportsPreview: boolean;
};

/** Client-only registry. Adding a format never changes the database schema. */
export const vaultFormats: readonly VaultFormat[] = [
  { mediaType: "text/markdown", label: "Markdown", editableAsText: true, supportsPreview: true },
  { mediaType: "text/plain", label: "Plain text", editableAsText: true, supportsPreview: true },
  { mediaType: "application/vnd.clipsx.env", label: "Environment file", editableAsText: true, supportsPreview: true },
];

export function resolveVaultFormat(mediaType: string | undefined): VaultFormat | null {
  return vaultFormats.find((format) => format.mediaType === mediaType) ?? (mediaType?.startsWith("text/") ? { mediaType, label: mediaType, editableAsText: true, supportsPreview: true } : null);
}
