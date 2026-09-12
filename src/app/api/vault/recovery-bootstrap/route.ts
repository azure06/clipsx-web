import { NextRequest } from 'next/server';

import { vaultCborError as createVaultCborError, vaultCborResponse as createVaultCborResponse } from '@/lib/vault/http';
import type { CborValue } from '@/lib/vault/protocol';
import { decodePostgresBytea } from '@/lib/vault/postgrest-bytea';
import { createClient, getVaultPrincipal } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Returns the data needed to authorize a replacement device using only the
 * recovery phrase — no active device is required.
 *
 * Response map:
 *   1 → protocol version (1)
 *   2 → recoveryKeyId (string)
 *   3 → accountHead (bytes, 32)
 *   4 → array of recovery epoch envelopes, each a map:
 *         1 → collectionId (string)
 *         2 → epochNumber (int)
 *         3 → encapsulation (bytes, 32)
 *         4 → ciphertext (bytes)
 *         5 → envelopePayload (bytes)
 *         6 → envelopePayloadHash (bytes, 32)
 *         7 → signature (bytes, 64)
 */
export async function GET(_request: NextRequest) {
  const requestId = crypto.randomUUID();
  const vaultCborError = (status: number, code: string) => createVaultCborError(status, code, requestId);
  const vaultCborResponse = (status: number, value: Map<number, CborValue>) => createVaultCborResponse(status, value, requestId);
  try {
    const principal = await getVaultPrincipal();
    if (!principal) return vaultCborError(401, 'unauthorized');

    const supabase = await createClient();

    const [recoveryResult, accountHeadResult] = await Promise.all([
      supabase.from('vault_recovery_keys').select('id').eq('account_id', principal.user.id).eq('status', 'active').limit(1).maybeSingle(),
      supabase.from('vault_account_operations').select('operation_hash').eq('account_id', principal.user.id).order('sequence_number', { ascending: false }).limit(1),
    ]);
    if (recoveryResult.error || accountHeadResult.error) throw recoveryResult.error ?? accountHeadResult.error;

    const recoveryKeyId = recoveryResult.data?.id;
    const accountHead = decodePostgresBytea(accountHeadResult.data?.[0]?.operation_hash);
    if (!recoveryKeyId || !accountHead) return vaultCborError(404, 'recovery-unavailable');

    const { data: envelopes, error: envelopeError } = await supabase
      .from('vault_recovery_epoch_envelopes')
      .select('collection_id, epoch_number, encapsulation, ciphertext, envelope_payload, envelope_payload_hash, signature')
      .eq('recovery_key_id', recoveryKeyId);
    if (envelopeError) throw envelopeError;

    const envelopeRecords: CborValue[] = [];
    for (const row of envelopes ?? []) {
      const encapsulation = decodePostgresBytea(row.encapsulation);
      const ciphertext = decodePostgresBytea(row.ciphertext);
      const payload = decodePostgresBytea(row.envelope_payload);
      const payloadHash = decodePostgresBytea(row.envelope_payload_hash);
      const signature = decodePostgresBytea(row.signature);
      if (!encapsulation || !ciphertext || !payload || !payloadHash || !signature) throw new Error('Invalid recovery envelope.');
      envelopeRecords.push(new Map<number, CborValue>([
        [1, row.collection_id], [2, row.epoch_number],
        [3, encapsulation], [4, ciphertext], [5, payload], [6, payloadHash], [7, signature],
      ]));
    }

    return vaultCborResponse(200, new Map<number, CborValue>([
      [1, 1], [2, recoveryKeyId], [3, accountHead], [4, envelopeRecords],
    ]));
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : undefined;
    console.error({ requestId, endpoint: 'recovery-bootstrap', stage: 'query', code });
    return vaultCborError(503, 'recovery-bootstrap-unavailable');
  }
}
