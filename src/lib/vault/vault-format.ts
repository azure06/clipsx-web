import type { LucideIcon } from "lucide-react";
import { FileText, FileCode2, Terminal, Braces, Table2 } from "lucide-react";

export type VaultFormat = {
  mediaType: string;
  label: string;
  description: string;
  icon: LucideIcon;
  editableAsText: boolean;
  supportsPreview: boolean;
  /** shown as a primary quick-create button */
  primary?: boolean;
};

/** Client-only registry. Adding a format never changes the database schema. */
export const vaultFormats: readonly VaultFormat[] = [
  {
    mediaType: "text/markdown",
    label: "Markdown",
    description: "Rich text with formatting",
    icon: FileCode2,
    editableAsText: true,
    supportsPreview: true,
    primary: true,
  },
  {
    mediaType: "text/plain",
    label: "Plain text",
    description: "Unformatted text or notes",
    icon: FileText,
    editableAsText: true,
    supportsPreview: true,
    primary: true,
  },
  {
    mediaType: "application/vnd.clipsx.env",
    label: "Environment file",
    description: ".env key=value pairs, with environment sections",
    icon: Terminal,
    editableAsText: true,
    supportsPreview: true,
    primary: true,
  },
  {
    mediaType: "application/json",
    label: "JSON",
    description: "Structured data or config",
    icon: Braces,
    editableAsText: true,
    supportsPreview: true,
  },
  {
    mediaType: "text/csv",
    label: "CSV",
    description: "Tabular data",
    icon: Table2,
    editableAsText: true,
    supportsPreview: true,
  },
];

export function resolveVaultFormat(mediaType: string | undefined): VaultFormat | null {
  return (
    vaultFormats.find((format) => format.mediaType === mediaType) ??
    (mediaType?.startsWith("text/")
      ? { mediaType, label: mediaType, description: "Text file", icon: FileText, editableAsText: true, supportsPreview: true }
      : null)
  );
}
