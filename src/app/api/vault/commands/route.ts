import { NextRequest, NextResponse } from 'next/server';

import { admitInitialDeviceRegistration, admitVaultCommand } from '@/lib/vault/command-admission';
import { encodeCanonicalCbor, sha256 } from '@/lib/vault/protocol';
import { createAdminClient } from '@/lib/supabase/admin';
import { getVaultPrincipal } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function cborError(status: number, code: string) {
  const body = encodeCanonicalCbor(new Map([[1, code]])).slice();
  return new NextResponse(body.buffer as ArrayBuffer, {
    status,
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/cbor' },
  });
}

function bytea(value: unknown): Uint8Array | null {
  if (typeof value !== 'string') return null;
  return new Uint8Array(Buffer.from(value, 'base64'));
}

export async function POST(request: NextRequest) {
  if (request.headers.get('content-type')?.split(';', 1)[0] !== 'application/cbor') {
    return cborError(422, 'invalid-content-type');
  }
  const principal = await getVaultPrincipal();
  if (!principal) return cborError(401, 'unauthorized');

  try {
    const body = new Uint8Array(await request.arrayBuffer());
    const admin = createAdminClient();
    const initial = await admitInitialDeviceRegistration(body, principal.user).catch(() => null);
    if (initial) {
      const registration = initial.registration;
      const { data, error } = await admin.schema('private').rpc('register_initial_vault_device', {
        p_account_id: principal.user.id, p_auth_session_id: principal.sessionId,
        p_challenge_id: registration.challengeId, p_challenge_response_hash: Buffer.from(registration.challengeResponseHash).toString('base64'),
        p_device_id: registration.deviceId, p_display_name: registration.displayName, p_platform: registration.platform, p_enrollment_origin: registration.enrollmentOrigin, p_protection_profile: registration.protectionProfile,
        p_capabilities: { hash: Buffer.from(registration.capabilitiesHash).toString('base64') }, p_device_encryption_public_key: Buffer.from(registration.deviceEncryptionPublicKey).toString('base64'), p_device_signing_public_key: Buffer.from(registration.deviceSigningPublicKey).toString('base64'),
        p_recovery_key_id: registration.recoveryKeyId, p_recovery_encryption_public_key: Buffer.from(registration.recoveryEncryptionPublicKey).toString('base64'), p_recovery_signing_public_key: Buffer.from(registration.recoverySigningPublicKey).toString('base64'),
        p_authorization_payload: Buffer.from(initial.command.signedBytes).toString('base64'), p_authorization_payload_hash: Buffer.from(await sha256(initial.command.signedBytes)).toString('base64'), p_device_proof_payload: Buffer.from(registration.deviceProofPayload).toString('base64'), p_device_proof_signature: Buffer.from(registration.deviceProofSignature).toString('base64'),
        p_operation_id: initial.command.operationId, p_command_payload: Buffer.from(initial.command.signedBytes).toString('base64'), p_command_hash: Buffer.from(await sha256(body)).toString('base64'), p_recovery_command_signature: Buffer.from(initial.command.signature).toString('base64'),
      });
      if (error || !data) return cborError(422, 'device-registration-rejected');
      const result = encodeCanonicalCbor(new Map([[1, initial.command.operationId]])).slice();
      return new NextResponse(result.buffer as ArrayBuffer, { status: 201, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/cbor' } });
    }
    const admission = await admitVaultCommand(body, { id: principal.user.id, sessionId: principal.sessionId }, {
      async findActiveDevice(id, accountId) {
        const { data } = await admin.from('vault_devices').select('signing_public_key, auth_session_id').eq('id', id).eq('account_id', accountId).eq('status', 'active').maybeSingle();
        const signingPublicKey = bytea(data?.signing_public_key);
        return signingPublicKey ? { signingPublicKey, boundSessionId: typeof data?.auth_session_id === 'string' ? data.auth_session_id : null } : null;
      },
      async findActiveRecoveryKey(id, accountId) {
        const { data } = await admin.from('vault_recovery_keys').select('signing_public_key').eq('id', id).eq('account_id', accountId).eq('status', 'active').maybeSingle();
        return bytea(data?.signing_public_key);
      },
    });

    if (admission.sessionBinding) {
      const { command } = admission;
      const { data, error } = await admin.schema('private').rpc('bind_vault_device_session', {
        p_account_id: principal.user.id, p_device_id: admission.sessionBinding.deviceId,
        p_session_id: admission.sessionBinding.sessionId,
        p_expected_previous_operation_hash: Buffer.from(command.expectedAccountHead!).toString('base64'),
        p_operation_id: command.operationId,
        p_command_payload: Buffer.from(command.signedBytes).toString('base64'),
        p_command_hash: Buffer.from(await sha256(body)).toString('base64'),
        p_signature: Buffer.from(command.signature).toString('base64'),
      });
      if (error || !data) return cborError(409, 'device-session-bind-rejected');
      const result = encodeCanonicalCbor(new Map([[1, command.operationId]])).slice();
      return new NextResponse(result.buffer as ArrayBuffer, { headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/cbor' } });
    }

    // No mutation is enabled until its command-specific private transaction is
    // implemented and tested. Never fall back to a browser table write.
    return cborError(422, `operation-not-enabled:${admission.command.operationType}`);
  } catch (error) {
    const code = error instanceof Error && /^(command-size|account-mismatch|inactive-author|invalid-signature|unbound-session)$/.test(error.message)
      ? error.message : 'invalid-command';
    return cborError(code === 'command-size' ? 413 : code === 'unbound-session' ? 403 : 422, code);
  }
}
