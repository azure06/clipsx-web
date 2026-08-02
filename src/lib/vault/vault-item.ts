import { decodeCanonicalCbor, encodeCanonicalCbor, type CborValue } from './protocol';

export const VAULT_ITEM_ENVELOPE_VERSION = 1;

/**
 * The complete item envelope is encrypted before it leaves the browser.  The
 * database deliberately has no format/kind column: formats are a client-side
 * registry concern, not server-visible metadata.
 */
export type VaultItemContent = {
  mediaType?: string;
  title: string;
  labels: string[];
  properties?: Record<string, string>;
  content?: Uint8Array;
  createdAt?: string;
  updatedAt?: string;
  /** @deprecated Transitional UI-only fields. They are never serialized as a server-visible format. */
  type?: 'note' | 'login'; body?: string; username?: string; password?: string; url?: string;
};

function text(record: Map<number, CborValue>, label: number, name: string): string {
  const value = record.get(label);
  if (typeof value !== 'string' || !value) throw new Error(`Invalid encrypted item ${name}.`);
  return value;
}

function canonicalProperties(properties: Record<string, string>): string {
  const entries = Object.entries(properties);
  if (entries.some(([key, value]) => !key || typeof value !== 'string')) {
    throw new Error('Encrypted item properties must have non-empty string keys and string values.');
  }
  return JSON.stringify(Object.fromEntries(entries.sort(([left], [right]) => left.localeCompare(right))));
}

export function encodeVaultItem(content: VaultItemContent): Uint8Array {
  const normalized = normalizeVaultItem(content);
  if (!normalized.mediaType || !normalized.title || !Array.isArray(normalized.labels)
    || normalized.labels.some((label) => typeof label !== 'string') || !(normalized.content instanceof Uint8Array)) {
    throw new Error('Invalid encrypted item envelope.');
  }
  return encodeCanonicalCbor(new Map<number, CborValue>([
    [1, VAULT_ITEM_ENVELOPE_VERSION], [2, normalized.mediaType], [3, normalized.title], [4, normalized.labels],
    [5, canonicalProperties(normalized.properties)], [6, normalized.content], [7, normalized.createdAt], [8, normalized.updatedAt],
  ]));
}

export function normalizeVaultItem(content: VaultItemContent): Required<Pick<VaultItemContent, 'mediaType' | 'properties' | 'content' | 'createdAt' | 'updatedAt'>> & VaultItemContent {
  const now = new Date().toISOString();
  return {
    ...content,
    mediaType: content.mediaType ?? 'text/plain',
    properties: content.properties ?? {},
    content: content.content ?? new TextEncoder().encode(content.body ?? ''),
    createdAt: content.createdAt ?? now,
    updatedAt: content.updatedAt ?? now,
  };
}

export function decodeVaultItem(bytes: Uint8Array): VaultItemContent {
  const record = decodeCanonicalCbor(bytes);
  const labels = record.get(4); const content = record.get(6); const rawProperties = record.get(5);
  if (record.size !== 8 || record.get(1) !== VAULT_ITEM_ENVELOPE_VERSION || !Array.isArray(labels)
    || labels.some((label) => typeof label !== 'string') || !(content instanceof Uint8Array)
    || typeof rawProperties !== 'string') throw new Error('Invalid encrypted item envelope.');
  let properties: unknown;
  try { properties = JSON.parse(rawProperties); } catch { throw new Error('Invalid encrypted item properties.'); }
  if (!properties || Array.isArray(properties) || Object.values(properties).some((value) => typeof value !== 'string')) {
    throw new Error('Invalid encrypted item properties.');
  }
  return {
    mediaType: text(record, 2, 'media type'), title: text(record, 3, 'title'), labels: [...labels] as string[],
    properties: properties as Record<string, string>, content: content.slice(),
    createdAt: text(record, 7, 'creation time'), updatedAt: text(record, 8, 'update time'),
  };
}

export function textItemContent(input: Omit<VaultItemContent, 'content'> & { content: string }): VaultItemContent {
  return { ...input, content: new TextEncoder().encode(input.content) };
}

export function decodeItemText(content: VaultItemContent): string {
  if (!content.mediaType || (!content.mediaType.startsWith('text/') && content.mediaType !== 'application/vnd.clipsx.env')) {
    throw new Error('This item is not text content.');
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(content.content ?? new Uint8Array());
}
