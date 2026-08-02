export type EnvSection = { name: string; content: string };

/** Read sections from item properties, migrating from legacy single-body items. */
export function readEnvSections(
  properties: Record<string, string> | undefined,
  legacyBody: string | undefined,
): EnvSection[] {
  const raw = properties?.sections;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((s) => typeof s.name === "string" && typeof s.content === "string")) {
        return parsed as EnvSection[];
      }
    } catch { /* fall through */ }
  }
  // migrate: treat existing body as a single "base" section
  return [{ name: "base", content: legacyBody ?? "" }];
}

/** Serialize sections back into properties and produce the merged body for CBOR storage. */
export function writeEnvSections(
  sections: EnvSection[],
  existingProperties: Record<string, string> | undefined,
): { properties: Record<string, string>; body: string } {
  return {
    properties: {
      ...(existingProperties ?? {}),
      sections: JSON.stringify(sections),
    },
    // body = the base section content, used as the canonical text for search/preview fallback
    body: sections.find((s) => s.name === "base")?.content ?? sections[0]?.content ?? "",
  };
}

/** Merge base + named section: base keys are overridden by section-specific keys. */
export function mergeEnvSections(sections: EnvSection[], sectionName: string): string {
  const base = sections.find((s) => s.name === "base");
  const target = sections.find((s) => s.name === sectionName);
  if (!base || sectionName === "base") return target?.content ?? "";

  const baseVars = parseEnvVars(base.content);
  const overrides = parseEnvVars(target?.content ?? "");
  const merged = new Map([...baseVars, ...overrides]);

  return Array.from(merged.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
}

function parseEnvVars(content: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    map.set(trimmed.slice(0, eq).trim(), trimmed.slice(eq + 1));
  }
  return map;
}
