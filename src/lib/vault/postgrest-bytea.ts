export function encodePostgresBytea(value: Uint8Array): string {
  return `\\x${Buffer.from(value).toString('hex')}`;
}

export function decodePostgresBytea(value: unknown): Uint8Array | null {
  if (typeof value !== 'string' || !/^\\x(?:[0-9a-fA-F]{2})*$/.test(value)) {
    return null;
  }
  return new Uint8Array(Buffer.from(value.slice(2), 'hex'));
}

export function encodeJsonBase64(value: Uint8Array): string {
  return Buffer.from(value).toString('base64');
}

export function decodeJsonBase64(value: unknown): Uint8Array | null {
  if (typeof value !== 'string') return null;
  const compact = value.replace(/[\r\n]/g, '');
  if (
    compact.length === 0
    || compact.length % 4 !== 0
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(compact)
  ) {
    return null;
  }
  const decoded = Buffer.from(compact, 'base64');
  return decoded.toString('base64') === compact ? new Uint8Array(decoded) : null;
}
