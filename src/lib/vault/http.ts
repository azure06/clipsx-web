import { decodeCanonicalCbor, encodeCanonicalCbor, type CborValue } from './protocol';

export const VAULT_CBOR_CONTENT_TYPE = 'application/cbor';
export const MAX_VAULT_COMMAND_BYTES = 1_100_000;
export const MAX_VAULT_RESPONSE_BYTES = 8 * 1024 * 1024;
export const VAULT_REQUEST_ID_HEADER = 'X-Vault-Request-Id';

export type VaultErrorCategory =
  | 'authentication'
  | 'configuration'
  | 'service'
  | 'request'
  | 'network'
  | 'unknown';

function mediaType(value: string | null): string {
  return value?.split(';', 1)[0]?.trim().toLowerCase() ?? '';
}

export class VaultHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly requestId?: string,
    readonly category: VaultErrorCategory = 'unknown',
  ) {
    super(message);
    this.name = 'VaultHttpError';
  }
}

export function vaultCborResponse(
  status: number,
  body: Map<number, CborValue>,
  requestId = crypto.randomUUID(),
): Response {
  // cborg may return a pooled Node Buffer. Passing its backing ArrayBuffer
  // would expose bytes outside this CBOR view; make an exact standalone copy.
  const encoded = new Uint8Array(encodeCanonicalCbor(body));
  return new Response(encoded, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': VAULT_CBOR_CONTENT_TYPE,
      'X-Content-Type-Options': 'nosniff',
      [VAULT_REQUEST_ID_HEADER]: requestId,
    },
  });
}

export function vaultCborError(status: number, code: string, requestId?: string): Response {
  return vaultCborResponse(status, new Map([[1, code]]), requestId);
}

function categoryForVaultError(status: number, code?: string): VaultErrorCategory {
  if (status === 401) return 'authentication';
  if (code === 'vault-service-misconfigured') return 'configuration';
  if (status >= 500) return 'service';
  return 'request';
}

export function vaultErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof VaultHttpError)) return error instanceof Error ? error.message : fallback;
  const suffix = error.requestId ? ` Reference: ${error.requestId}.` : '';
  if (error.category === 'authentication') return `Your sign-in session has expired. Sign in again and retry.${suffix}`;
  if (error.category === 'configuration' || error.code === 'challenge-store-failed') {
    return `Vault setup is temporarily unavailable. Contact support with this reference.${suffix}`;
  }
  if (error.category === 'service') return `Vault service is temporarily unavailable. Retry shortly.${suffix}`;
  return `${error.message}${suffix}`;
}

export async function readVaultCborRequest(
  request: Request,
  maximumBytes: number,
): Promise<Uint8Array> {
  if (mediaType(request.headers.get('content-type')) !== VAULT_CBOR_CONTENT_TYPE) {
    throw new VaultHttpError('invalid-content-type', 422, 'invalid-content-type');
  }
  const declaredLength = request.headers.get('content-length');
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length) || length < 0 || length > maximumBytes) {
      throw new VaultHttpError('request-too-large', 413, 'request-too-large');
    }
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength === 0) {
    throw new VaultHttpError('empty-request', 422, 'empty-request');
  }
  if (bytes.byteLength > maximumBytes) {
    throw new VaultHttpError('request-too-large', 413, 'request-too-large');
  }
  return bytes;
}

export async function readVaultCborResponse(
  response: Response,
  fallback: string,
  maximumBytes = MAX_VAULT_RESPONSE_BYTES,
): Promise<Map<number, CborValue>> {
  return (await readVaultCborResponseBytes(response, fallback, maximumBytes)).record;
}

export async function readVaultCborResponseBytes(
  response: Response,
  fallback: string,
  maximumBytes = MAX_VAULT_RESPONSE_BYTES,
): Promise<{ bytes: Uint8Array; record: Map<number, CborValue> }> {
  if (mediaType(response.headers.get('content-type')) !== VAULT_CBOR_CONTENT_TYPE) {
    throw new VaultHttpError(fallback, response.status, undefined, response.headers.get(VAULT_REQUEST_ID_HEADER) ?? undefined, 'network');
  }
  const declaredLength = response.headers.get('content-length');
  if (declaredLength !== null && Number(declaredLength) > maximumBytes) {
    throw new VaultHttpError(fallback, response.status, undefined, response.headers.get(VAULT_REQUEST_ID_HEADER) ?? undefined, 'network');
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > maximumBytes) {
    throw new VaultHttpError(fallback, response.status, undefined, response.headers.get(VAULT_REQUEST_ID_HEADER) ?? undefined, 'network');
  }
  let record: Map<number, CborValue>;
  try {
    record = decodeCanonicalCbor(bytes);
  } catch {
    throw new VaultHttpError(fallback, response.status, undefined, response.headers.get(VAULT_REQUEST_ID_HEADER) ?? undefined, 'network');
  }
  if (!response.ok) {
    const code = record.get(1);
    throw new VaultHttpError(
      typeof code === 'string' ? `${fallback}: ${code}` : fallback,
      response.status,
      typeof code === 'string' ? code : undefined,
      response.headers.get(VAULT_REQUEST_ID_HEADER) ?? undefined,
      categoryForVaultError(response.status, typeof code === 'string' ? code : undefined),
    );
  }
  return { bytes, record };
}
