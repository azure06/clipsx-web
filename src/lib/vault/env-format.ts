export type EnvironmentEntry = {
  line: number;
  key: string;
  value: string;
  raw: string;
};

/**
 * Read-only, conservative .env parsing for redacted previews. Raw content is
 * canonical; this parser never serializes or rewrites the source file.
 */
export function parseEnvironmentPreview(source: string): EnvironmentEntry[] {
  return source.split(/\r?\n/).flatMap((raw, index) => {
    const match = raw.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    return match ? [{ line: index + 1, key: match[1], value: match[2], raw }] : [];
  });
}

export function redactEnvironmentValue(value: string): string {
  return value.length === 0 ? "(empty)" : "•".repeat(Math.min(Math.max(value.length, 8), 24));
}

export function environmentItem(input: { title: string; source: string; environment: string; filename?: string; labels?: string[]; createdAt?: string; updatedAt?: string }) {
  return {
    mediaType: "application/vnd.clipsx.env",
    title: input.title,
    labels: input.labels ?? ["environment"],
    properties: { environment: input.environment, filename: input.filename ?? ".env" },
    content: new TextEncoder().encode(input.source),
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}
