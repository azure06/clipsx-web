import type { LucideIcon } from "lucide-react";
import { FileText, FileCode2, Terminal, Braces, Table2, FileCode, Database, Code2, Package, Globe, KeyRound, Shield, Hash } from "lucide-react";

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
  // Tier 1 — text formats
  {
    mediaType: "text/yaml",
    label: "YAML",
    description: "Config or structured data",
    icon: FileCode,
    editableAsText: true,
    supportsPreview: false,
  },
  {
    mediaType: "text/toml",
    label: "TOML",
    description: "Config file (TOML)",
    icon: Package,
    editableAsText: true,
    supportsPreview: false,
  },
  {
    mediaType: "text/x-shellscript",
    label: "Shell",
    description: "Shell script",
    icon: Terminal,
    editableAsText: true,
    supportsPreview: false,
  },
  {
    mediaType: "text/x-sql",
    label: "SQL",
    description: "Database queries",
    icon: Database,
    editableAsText: true,
    supportsPreview: false,
  },
  {
    mediaType: "text/xml",
    label: "XML",
    description: "Markup or config",
    icon: Code2,
    editableAsText: true,
    supportsPreview: false,
  },
  {
    mediaType: "text/x-ini",
    label: "INI",
    description: "INI / config file",
    icon: FileCode,
    editableAsText: true,
    supportsPreview: false,
  },
  {
    mediaType: "text/x-dockerfile",
    label: "Dockerfile",
    description: "Container build instructions",
    icon: Package,
    editableAsText: true,
    supportsPreview: false,
  },
  // Tier 2 — structured types
  {
    mediaType: "application/vnd.clipsx.login",
    label: "Login",
    description: "Site URL, username, password",
    icon: Globe,
    editableAsText: false,
    supportsPreview: true,
  },
  {
    mediaType: "application/vnd.clipsx.totp",
    label: "TOTP / 2FA",
    description: "Time-based one-time password",
    icon: Hash,
    editableAsText: false,
    supportsPreview: true,
  },
  {
    mediaType: "application/vnd.clipsx.ssh",
    label: "SSH Key",
    description: "Private + public key pair",
    icon: KeyRound,
    editableAsText: false,
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
