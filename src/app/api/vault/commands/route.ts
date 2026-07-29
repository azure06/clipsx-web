import { NextRequest, NextResponse } from 'next/server';

import { admitCollectionCreation, admitInitialDeviceRegistration, admitNoteAppend, admitNoteDelete, admitVaultCommand } from '@/lib/vault/command-admission';
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

    if (admission.command.operationType === 'collection-create') {
      const creation = admitCollectionCreation(admission.command);
      const { command } = admission;
      const { data, error } = await admin.schema('private').rpc('create_vault_collection', {
        p_account_id: principal.user.id, p_session_id: principal.sessionId, p_device_id: command.authorDeviceId!, p_collection_id: creation.collectionId,
        p_encrypted_metadata: Buffer.from(creation.encryptedMetadata).toString('base64'), p_metadata_nonce: Buffer.from(creation.metadataNonce).toString('base64'),
        p_membership_state_hash: Buffer.from(creation.membershipStateHash).toString('base64'), p_recipient_set_commitment: Buffer.from(creation.recipientSetCommitment).toString('base64'),
        p_transition_payload: Buffer.from(creation.transitionPayload).toString('base64'), p_transition_signature: Buffer.from(creation.transitionSignature).toString('base64'), p_transition_hash: Buffer.from(creation.transitionHash).toString('base64'),
        p_device_envelope_enc: Buffer.from(creation.deviceEnvelope.encapsulation).toString('base64'), p_device_envelope_ciphertext: Buffer.from(creation.deviceEnvelope.ciphertext).toString('base64'), p_device_envelope_payload: Buffer.from(creation.deviceEnvelope.payload).toString('base64'), p_device_envelope_signature: Buffer.from(creation.deviceEnvelope.signature).toString('base64'),
        p_recovery_key_id: creation.recoveryKeyId, p_recovery_envelope_enc: Buffer.from(creation.recoveryEnvelope.encapsulation).toString('base64'), p_recovery_envelope_ciphertext: Buffer.from(creation.recoveryEnvelope.ciphertext).toString('base64'), p_recovery_envelope_payload: Buffer.from(creation.recoveryEnvelope.payload).toString('base64'), p_recovery_envelope_signature: Buffer.from(creation.recoveryEnvelope.signature).toString('base64'),
        p_operation_id: command.operationId, p_command_payload: Buffer.from(command.signedBytes).toString('base64'), p_command_hash: Buffer.from(await sha256(body)).toString('base64'), p_command_signature: Buffer.from(command.signature).toString('base64'),
      });
      if (error || !data) return cborError(409, 'collection-create-rejected');
      const result = encodeCanonicalCbor(new Map([[1, command.operationId], [2, creation.collectionId]])).slice();
      return new NextResponse(result.buffer as ArrayBuffer, { status: 201, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/cbor' } });
    }

    if (admission.command.operationType === 'note-append') {
      const { command } = admission;
      const { data: author } = await admin.from('vault_devices').select('signing_public_key')
        .eq('id', command.authorDeviceId!).eq('account_id', principal.user.id).eq('status', 'active').maybeSingle();
      const signingPublicKey = bytea(author?.signing_public_key);
      if (!signingPublicKey) return cborError(422, 'note-append-rejected');
      const note = await admitNoteAppend(command, signingPublicKey);
      const { data, error } = await admin.schema('private').rpc('append_vault_note_revision', {
        p_account_id: principal.user.id, p_session_id: principal.sessionId, p_device_id: command.authorDeviceId!, p_collection_id: command.collectionId!,
        p_expected_collection_head: Buffer.from(command.expectedCollectionHead!).toString('base64'), p_note_id: note.noteId, p_expected_previous_revision_hash: note.previousRevisionHash ? Buffer.from(note.previousRevisionHash).toString('base64') : null, p_collection_epoch: note.collectionEpoch,
        p_encrypted_content: Buffer.from(note.encryptedContent).toString('base64'), p_content_nonce: Buffer.from(note.contentNonce).toString('base64'),
        p_wrapped_revision_key: Buffer.from(note.wrappedRevisionKey).toString('base64'), p_key_wrap_nonce: Buffer.from(note.keyWrapNonce).toString('base64'),
        p_ciphertext_hash: Buffer.from(note.ciphertextHash).toString('base64'), p_wrapped_revision_key_hash: Buffer.from(note.wrappedRevisionKeyHash).toString('base64'),
        p_revision_hash: Buffer.from(note.revisionHash).toString('base64'), p_revision_signature: Buffer.from(note.revisionSignature).toString('base64'),
        p_operation_id: command.operationId, p_command_payload: Buffer.from(command.signedBytes).toString('base64'),
        p_command_hash: Buffer.from(await sha256(body)).toString('base64'), p_command_signature: Buffer.from(command.signature).toString('base64'),
      });
      if (error || !data) return cborError(409, 'note-append-rejected');
      const result = encodeCanonicalCbor(new Map([[1, command.operationId], [2, note.noteId]])).slice();
      return new NextResponse(result.buffer as ArrayBuffer, { status: 201, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/cbor' } });
    }

    if (admission.command.operationType === 'note-delete') {
      const { command } = admission;
      const deleted = admitNoteDelete(command);
      const { data, error } = await admin.schema('private').rpc('delete_vault_note', {
        p_account_id: principal.user.id, p_session_id: principal.sessionId, p_device_id: command.authorDeviceId!, p_collection_id: command.collectionId!,
        p_expected_collection_head: Buffer.from(command.expectedCollectionHead!).toString('base64'), p_note_id: deleted.noteId,
        p_expected_revision_hash: Buffer.from(deleted.expectedRevisionHash).toString('base64'), p_operation_id: command.operationId,
        p_command_payload: Buffer.from(command.signedBytes).toString('base64'), p_command_hash: Buffer.from(await sha256(body)).toString('base64'),
        p_command_signature: Buffer.from(command.signature).toString('base64'),
      });
      if (error || !data) return cborError(409, 'note-delete-rejected');
      const result = encodeCanonicalCbor(new Map([[1, command.operationId], [2, deleted.noteId]])).slice();
      return new NextResponse(result.buffer as ArrayBuffer, { status: 201, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/cbor' } });
    }

    // No mutation is enabled until its command-specific private transaction is
    // implemented and tested. Never fall back to a browser table write.
    return cborError(422, `operation-not-enabled:${admission.command.operationType}`);
  } catch (error) {
    const code = error instanceof Error && /^(command-size|account-mismatch|inactive-author|invalid-signature|unbound-session|invalid-note-append)$/.test(error.message)
      ? error.message : 'invalid-command';
    return cborError(code === 'command-size' ? 413 : code === 'unbound-session' ? 403 : 422, code);
  }
}
