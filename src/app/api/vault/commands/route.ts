import { NextRequest } from 'next/server';

import { admitCollectionCreation, admitDeviceAuthorization, admitDeviceRevocation, admitInitialDeviceRegistration, admitNoteAppend, admitNoteDelete, admitPendingDeviceRegistration, admitRecoveryDeviceAuthorization, admitRecoveryRotation, admitVaultCommand } from '@/lib/vault/command-admission';
import { MAX_VAULT_COMMAND_BYTES, readVaultCborRequest, VaultHttpError, vaultCborError as createVaultCborError, vaultCborResponse as createVaultCborResponse } from '@/lib/vault/http';
import { decodePostgresBytea, encodeJsonBase64, encodePostgresBytea } from '@/lib/vault/postgrest-bytea';
import { decodeCanonicalCbor, sha256, type CborValue } from '@/lib/vault/protocol';
import {
  admitInvitationAccept,
  admitInvitationConfirm,
  admitInvitationCreate,
  admitMemberAdd,
  admitMemberRemove,
  type SharingEnvelope,
} from '@/lib/vault/sharing-command-admission';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient, getVaultPrincipal } from '@/lib/supabase/server';

export const runtime = 'nodejs';

function encodeSharingEnvelope(envelope: SharingEnvelope) {
  return {
    recipient_id: envelope.recipientId,
    epoch_number: envelope.epochNumber,
    encapsulation: encodeJsonBase64(envelope.encapsulation),
    ciphertext: encodeJsonBase64(envelope.ciphertext),
    payload: encodeJsonBase64(envelope.payload),
    signature: encodeJsonBase64(envelope.signature),
  };
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const vaultCborError = (status: number, code: string) => createVaultCborError(status, code, requestId);
  const vaultCborResponse = (status: number, value: Map<number, CborValue>) => createVaultCborResponse(status, value, requestId);
  try {
    const body = await readVaultCborRequest(request, MAX_VAULT_COMMAND_BYTES);
    const principal = await getVaultPrincipal();
    if (!principal) return vaultCborError(401, 'unauthorized');
    const admin = createAdminClient();
    const userClient = await createClient();
    const initial = await admitInitialDeviceRegistration(body, principal.user).catch(() => null);
    if (initial) {
      const registration = initial.registration;
      const { data, error } = await admin.schema('private').rpc('register_initial_vault_device', {
        p_account_id: principal.user.id, p_auth_session_id: principal.sessionId,
        p_challenge_id: registration.challengeId, p_challenge_response_hash: encodePostgresBytea(registration.challengeResponseHash),
        p_device_id: registration.deviceId, p_display_name: registration.displayName, p_platform: registration.platform, p_enrollment_origin: registration.enrollmentOrigin, p_protection_profile: registration.protectionProfile,
        p_capabilities: { hash: encodeJsonBase64(registration.capabilitiesHash) }, p_device_encryption_public_key: encodePostgresBytea(registration.deviceEncryptionPublicKey), p_device_signing_public_key: encodePostgresBytea(registration.deviceSigningPublicKey),
        p_recovery_key_id: registration.recoveryKeyId, p_recovery_encryption_public_key: encodePostgresBytea(registration.recoveryEncryptionPublicKey), p_recovery_signing_public_key: encodePostgresBytea(registration.recoverySigningPublicKey),
        p_authorization_payload: encodePostgresBytea(initial.command.signedBytes), p_authorization_payload_hash: encodePostgresBytea(await sha256(initial.command.signedBytes)), p_device_proof_payload: encodePostgresBytea(registration.deviceProofPayload), p_device_proof_signature: encodePostgresBytea(registration.deviceProofSignature),
        p_operation_id: initial.command.operationId, p_command_payload: encodePostgresBytea(initial.command.signedBytes), p_command_hash: encodePostgresBytea(await sha256(initial.command.operationBytes)), p_recovery_command_signature: encodePostgresBytea(initial.command.signature),
      });
      if (error || !data) return vaultCborError(422, 'device-registration-rejected');
      return vaultCborResponse(201, new Map([[1, initial.command.operationId]]));
    }
    const pending = await admitPendingDeviceRegistration(body, principal.user).catch(() => null);
    if (pending) {
      const registration = pending.registration;
      const { data, error } = await admin.schema('private').rpc('register_pending_vault_device', {
        p_account_id: principal.user.id, p_auth_session_id: principal.sessionId, p_challenge_id: registration.challengeId,
        p_challenge_response_hash: encodePostgresBytea(registration.challengeResponseHash), p_device_id: registration.deviceId,
        p_display_name: registration.displayName, p_platform: registration.platform, p_enrollment_origin: registration.enrollmentOrigin,
        p_protection_profile: registration.protectionProfile, p_capabilities: { hash: encodeJsonBase64(registration.capabilitiesHash) },
        p_device_encryption_public_key: encodePostgresBytea(registration.deviceEncryptionPublicKey), p_device_signing_public_key: encodePostgresBytea(registration.deviceSigningPublicKey),
        p_proof_payload: encodePostgresBytea(registration.deviceProofPayload), p_proof_signature: encodePostgresBytea(registration.deviceProofSignature),
        p_proof_hash: encodePostgresBytea(await sha256(pending.command.signedBytes)), p_sas_commitment: encodePostgresBytea(registration.sasCommitment),
      });
      if (error || !data) return vaultCborError(422, 'pending-device-registration-rejected');
      return vaultCborResponse(201, new Map([[1, pending.command.operationId]]));
    }
    const admission = await admitVaultCommand(body, { id: principal.user.id, sessionId: principal.sessionId }, {
      async findActiveDevice(id, accountId) {
        const { data, error } = await userClient.from('vault_devices').select('signing_public_key, auth_session_id').eq('id', id).eq('account_id', accountId).eq('status', 'active').maybeSingle();
        if (error) throw error;
        const signingPublicKey = decodePostgresBytea(data?.signing_public_key);
        return signingPublicKey ? { signingPublicKey, boundSessionId: typeof data?.auth_session_id === 'string' ? data.auth_session_id : null } : null;
      },
      async findActiveRecoveryKey(id, accountId) {
        const { data, error } = await userClient.from('vault_recovery_keys').select('signing_public_key').eq('id', id).eq('account_id', accountId).eq('status', 'active').maybeSingle();
        if (error) throw error;
        return decodePostgresBytea(data?.signing_public_key);
      },
    });

    if (admission.sessionBinding) {
      const { command } = admission;
      const { data, error } = await admin.schema('private').rpc('bind_vault_device_session', {
        p_account_id: principal.user.id, p_device_id: admission.sessionBinding.deviceId,
        p_session_id: admission.sessionBinding.sessionId,
        p_expected_previous_operation_hash: encodePostgresBytea(command.expectedAccountHead!),
        p_operation_id: command.operationId,
        p_command_payload: encodePostgresBytea(command.signedBytes),
        p_command_hash: encodePostgresBytea(await sha256(command.operationBytes)),
        p_signature: encodePostgresBytea(command.signature),
      });
      if (error || !data) return vaultCborError(409, 'device-session-bind-rejected');
      return vaultCborResponse(200, new Map([[1, command.operationId]]));
    }

    if (admission.command.operationType === 'device-authorize') {
      const { command } = admission;
      if (command.recoveryKeyId) {
        const authorization = admitRecoveryDeviceAuthorization(command);
        const { data, error } = await admin.schema('private').rpc('authorize_pending_vault_device_with_recovery', {
          p_account_id: principal.user.id, p_session_id: principal.sessionId, p_recovery_key_id: command.recoveryKeyId,
          p_device_id: authorization.deviceId, p_expected_previous_operation_hash: encodePostgresBytea(command.expectedAccountHead!),
          p_authorization_payload: encodePostgresBytea(command.signedBytes), p_authorization_payload_hash: encodePostgresBytea(await sha256(command.signedBytes)),
          p_pending_command_hash: encodePostgresBytea(authorization.pendingCommandHash),
          p_envelopes: authorization.envelopes.map((envelope) => ({ collection_id: envelope.collectionId, epoch_number: envelope.epochNumber, encapsulation: encodeJsonBase64(envelope.encapsulation), ciphertext: encodeJsonBase64(envelope.ciphertext), payload: encodeJsonBase64(envelope.payload), signature: encodeJsonBase64(envelope.signature) })),
          p_operation_id: command.operationId, p_command_hash: encodePostgresBytea(await sha256(command.operationBytes)), p_signature: encodePostgresBytea(command.signature),
        });
        if (error || !data) return vaultCborError(409, 'recovery-device-authorization-rejected');
        return vaultCborResponse(201, new Map([[1, command.operationId], [2, authorization.deviceId]]));
      }
      const authorization = admitDeviceAuthorization(command);
      const { data, error } = await admin.schema('private').rpc('authorize_pending_vault_device', {
        p_account_id: principal.user.id, p_session_id: principal.sessionId, p_authorizer_device_id: command.authorDeviceId!,
        p_device_id: authorization.deviceId, p_expected_previous_operation_hash: encodePostgresBytea(command.expectedAccountHead!),
        p_authorization_payload: encodePostgresBytea(command.signedBytes), p_authorization_payload_hash: encodePostgresBytea(await sha256(command.signedBytes)),
        p_pending_command_hash: encodePostgresBytea(authorization.pendingCommandHash), p_sas_hash: encodePostgresBytea(authorization.sasHash),
        p_envelopes: authorization.envelopes.map((envelope) => ({ collection_id: envelope.collectionId, epoch_number: envelope.epochNumber, encapsulation: encodeJsonBase64(envelope.encapsulation), ciphertext: encodeJsonBase64(envelope.ciphertext), payload: encodeJsonBase64(envelope.payload), signature: encodeJsonBase64(envelope.signature) })),
        p_operation_id: command.operationId, p_command_hash: encodePostgresBytea(await sha256(command.operationBytes)), p_signature: encodePostgresBytea(command.signature),
      });
      if (error || !data) return vaultCborError(409, 'device-authorization-rejected');
      return vaultCborResponse(201, new Map([[1, command.operationId], [2, authorization.deviceId]]));
    }

    if (admission.command.operationType === 'device-revoke') {
      const { command } = admission; const revoked = admitDeviceRevocation(command);
      const encodeEnvelope = (entry: Map<number, unknown>) => ({ recipient_id: entry.get(1), encapsulation: encodeJsonBase64(entry.get(2) as Uint8Array), ciphertext: encodeJsonBase64(entry.get(3) as Uint8Array), payload: encodeJsonBase64(entry.get(4) as Uint8Array), signature: encodeJsonBase64(entry.get(5) as Uint8Array) });
      const rotations = revoked.rotations.map((rotation) => ({ collection_id: rotation.collectionId, epoch_number: rotation.epochNumber, membership_hash: encodeJsonBase64(rotation.membershipHash), recipient_commitment: encodeJsonBase64(rotation.recipientCommitment), transition_payload: encodeJsonBase64(rotation.transitionPayload), transition_signature: encodeJsonBase64(rotation.transitionSignature), transition_hash: encodeJsonBase64(rotation.transitionHash), device_envelopes: rotation.deviceEnvelopes.map(encodeEnvelope), recovery_envelopes: rotation.recoveryEnvelopes.map(encodeEnvelope) }));
      const { data, error } = await admin.schema('private').rpc('revoke_vault_device_and_rotate_epochs', {
        p_account_id: principal.user.id, p_session_id: principal.sessionId, p_author_device_id: command.authorDeviceId!, p_revoked_device_id: revoked.deviceId, p_reason: revoked.reason, p_expected_previous_operation_hash: encodePostgresBytea(command.expectedAccountHead!), p_rotations: rotations, p_operation_id: command.operationId, p_command_payload: encodePostgresBytea(command.signedBytes), p_command_hash: encodePostgresBytea(await sha256(command.operationBytes)), p_signature: encodePostgresBytea(command.signature),
      });
      if (error || !data) return vaultCborError(409, 'device-revocation-rejected');
      return vaultCborResponse(201, new Map([[1, command.operationId], [2, revoked.deviceId]]));
    }

    if (admission.command.operationType === 'recovery-rotate') {
      const { command } = admission;
      const raw = decodeCanonicalCbor(command.payload) as Map<number, unknown>;
      const activeDeviceId = raw.get(4);
      if (typeof activeDeviceId !== 'string') return vaultCborError(422, 'invalid-recovery-rotation');
      const { data: active, error: activeError } = await userClient.from('vault_devices').select('signing_public_key').eq('id', activeDeviceId).eq('account_id', principal.user.id).eq('status', 'active').eq('auth_session_id', principal.sessionId).maybeSingle();
      if (activeError) throw activeError;
      const activeKey = decodePostgresBytea(active?.signing_public_key); if (!activeKey) return vaultCborError(403, 'invalid-recovery-rotation');
      const rotation = await admitRecoveryRotation(command, activeKey);
      const envelopes = rotation.envelopes.map((e) => ({ collection_id: e.get(1), epoch_number: e.get(2), encapsulation: encodeJsonBase64(e.get(3) as Uint8Array), ciphertext: encodeJsonBase64(e.get(4) as Uint8Array), payload: encodeJsonBase64(e.get(5) as Uint8Array), signature: encodeJsonBase64(e.get(6) as Uint8Array) }));
      const { data, error } = await admin.schema('private').rpc('rotate_vault_recovery_root', { p_account_id: principal.user.id, p_session_id: principal.sessionId, p_old_recovery_key_id: command.recoveryKeyId!, p_active_device_id: rotation.activeDeviceId, p_new_recovery_key_id: rotation.newRecoveryKeyId, p_new_encryption_public_key: encodePostgresBytea(rotation.encryptionPublicKey), p_new_signing_public_key: encodePostgresBytea(rotation.signingPublicKey), p_expected_previous_operation_hash: encodePostgresBytea(command.expectedAccountHead!), p_authorization_payload: encodePostgresBytea(command.signedBytes), p_active_device_signature: encodePostgresBytea(rotation.activeSignature), p_envelopes: envelopes, p_operation_id: command.operationId, p_command_hash: encodePostgresBytea(await sha256(command.operationBytes)), p_recovery_signature: encodePostgresBytea(command.signature) });
      if (error || !data) return vaultCborError(409, 'recovery-rotation-rejected');
      return vaultCborResponse(201, new Map([[1, command.operationId]]));
    }

    if (admission.command.operationType === 'invitation-create') {
      const { command } = admission;
      const { data: author, error: authorError } = await userClient.from('vault_devices').select('signing_public_key')
        .eq('id', command.authorDeviceId!).eq('account_id', principal.user.id).eq('status', 'active').maybeSingle();
      if (authorError) throw authorError;
      const signingPublicKey = decodePostgresBytea(author?.signing_public_key);
      if (!signingPublicKey) return vaultCborError(422, 'invitation-create-rejected');
      const invitation = admitInvitationCreate(command, signingPublicKey);
      const { data, error } = await admin.schema('private').rpc('create_vault_collection_invitation', {
        p_account_id: principal.user.id,
        p_session_id: principal.sessionId,
        p_device_id: command.authorDeviceId!,
        p_collection_id: command.collectionId!,
        p_expected_collection_head: encodePostgresBytea(command.expectedCollectionHead!),
        p_invitation_id: invitation.invitationId,
        p_membership_id: invitation.membershipId,
        p_recipient_account_id: invitation.recipientAccountId,
        p_requested_role: invitation.role,
        p_expires_at: invitation.expiresAt,
        p_invitation_key_commitment: encodePostgresBytea(invitation.invitationKeyCommitment),
        p_verification_commitment: encodePostgresBytea(invitation.verificationCommitment),
        p_operation_id: command.operationId,
        p_command_payload: encodePostgresBytea(command.signedBytes),
        p_command_hash: encodePostgresBytea(await sha256(command.operationBytes)),
        p_command_signature: encodePostgresBytea(command.signature),
      });
      if (error || !data) return vaultCborError(409, 'invitation-create-rejected');
      return vaultCborResponse(201, new Map([[1, command.operationId], [2, invitation.invitationId]]));
    }

    if (admission.command.operationType === 'invitation-accept') {
      const { command } = admission;
      const { data: author, error: authorError } = await userClient.from('vault_devices').select('signing_public_key, encryption_public_key')
        .eq('id', command.authorDeviceId!).eq('account_id', principal.user.id).eq('status', 'active').maybeSingle();
      if (authorError) throw authorError;
      const signingPublicKey = decodePostgresBytea(author?.signing_public_key);
      const encryptionPublicKey = decodePostgresBytea(author?.encryption_public_key);
      if (!signingPublicKey || !encryptionPublicKey) return vaultCborError(422, 'invitation-accept-rejected');
      const acceptance = admitInvitationAccept(command, signingPublicKey, encryptionPublicKey);
      const { data, error } = await admin.schema('private').rpc('accept_vault_collection_invitation', {
        p_account_id: principal.user.id,
        p_session_id: principal.sessionId,
        p_device_id: command.authorDeviceId!,
        p_collection_id: command.collectionId!,
        p_expected_collection_head: encodePostgresBytea(command.expectedCollectionHead!),
        p_invitation_id: acceptance.invitationId,
        p_invitation_command_hash: encodePostgresBytea(acceptance.invitationCommandHash),
        p_verification_commitment: encodePostgresBytea(acceptance.verificationCommitment),
        p_acceptance_transcript_hash: encodePostgresBytea(acceptance.transcriptHash),
        p_operation_id: command.operationId,
        p_command_payload: encodePostgresBytea(command.signedBytes),
        p_command_hash: encodePostgresBytea(await sha256(command.operationBytes)),
        p_command_signature: encodePostgresBytea(command.signature),
      });
      if (error || !data) return vaultCborError(409, 'invitation-accept-rejected');
      return vaultCborResponse(201, new Map([[1, command.operationId], [2, acceptance.invitationId]]));
    }

    if (admission.command.operationType === 'invitation-confirm') {
      const { command } = admission;
      const confirmation = admitInvitationConfirm(command);
      const { data, error } = await admin.schema('private').rpc('confirm_vault_collection_invitation', {
        p_account_id: principal.user.id,
        p_session_id: principal.sessionId,
        p_device_id: command.authorDeviceId!,
        p_collection_id: command.collectionId!,
        p_expected_collection_head: encodePostgresBytea(command.expectedCollectionHead!),
        p_invitation_id: confirmation.invitationId,
        p_acceptance_payload_hash: encodePostgresBytea(confirmation.acceptanceCommandHash),
        p_acceptance_transcript_hash: encodePostgresBytea(confirmation.transcriptHash),
        p_verification_commitment: encodePostgresBytea(confirmation.verificationCommitment),
        p_operation_id: command.operationId,
        p_command_payload: encodePostgresBytea(command.signedBytes),
        p_command_hash: encodePostgresBytea(await sha256(command.operationBytes)),
        p_command_signature: encodePostgresBytea(command.signature),
      });
      if (error || !data) return vaultCborError(409, 'invitation-confirm-rejected');
      return vaultCborResponse(201, new Map([[1, command.operationId], [2, confirmation.invitationId]]));
    }

    if (admission.command.operationType === 'member-add') {
      const { command } = admission;
      const { data: author, error: authorError } = await userClient.from('vault_devices').select('signing_public_key')
        .eq('id', command.authorDeviceId!).eq('account_id', principal.user.id).eq('status', 'active').maybeSingle();
      if (authorError) throw authorError;
      const signingPublicKey = decodePostgresBytea(author?.signing_public_key);
      if (!signingPublicKey) return vaultCborError(422, 'member-add-rejected');
      const member = await admitMemberAdd(command, signingPublicKey);
      const { data, error } = await admin.schema('private').rpc('add_vault_collection_member_and_rotate_epoch', {
        p_account_id: principal.user.id,
        p_session_id: principal.sessionId,
        p_device_id: command.authorDeviceId!,
        p_collection_id: command.collectionId!,
        p_expected_collection_head: encodePostgresBytea(command.expectedCollectionHead!),
        p_invitation_id: member.invitationId,
        p_membership_id: member.membershipId,
        p_recipient_account_id: member.recipientAccountId,
        p_requested_role: member.role,
        p_joined_epoch: member.joinedEpoch,
        p_history_access_from_epoch: member.historyAccessFromEpoch,
        p_membership_state_hash: encodePostgresBytea(member.membershipStateHash),
        p_recipient_set_commitment: encodePostgresBytea(member.recipientSetCommitment),
        p_transition_payload: encodePostgresBytea(member.transitionPayload),
        p_transition_signature: encodePostgresBytea(member.transitionSignature),
        p_transition_hash: encodePostgresBytea(member.transitionHash),
        p_device_envelopes: member.deviceEnvelopes.map(encodeSharingEnvelope),
        p_recovery_envelopes: member.recoveryEnvelopes.map(encodeSharingEnvelope),
        p_historical_device_envelopes: member.historicalDeviceEnvelopes.map(encodeSharingEnvelope),
        p_historical_recovery_envelopes: member.historicalRecoveryEnvelopes.map(encodeSharingEnvelope),
        p_operation_id: command.operationId,
        p_command_payload: encodePostgresBytea(command.signedBytes),
        p_command_hash: encodePostgresBytea(await sha256(command.operationBytes)),
        p_command_signature: encodePostgresBytea(command.signature),
      });
      if (error || !data) return vaultCborError(409, 'member-add-rejected');
      return vaultCborResponse(201, new Map<number, CborValue>([[1, command.operationId], [2, member.membershipId], [3, member.joinedEpoch]]));
    }

    if (admission.command.operationType === 'member-remove') {
      const { command } = admission;
      const { data: author, error: authorError } = await userClient.from('vault_devices').select('signing_public_key')
        .eq('id', command.authorDeviceId!).eq('account_id', principal.user.id).eq('status', 'active').maybeSingle();
      if (authorError) throw authorError;
      const signingPublicKey = decodePostgresBytea(author?.signing_public_key);
      if (!signingPublicKey) return vaultCborError(422, 'member-remove-rejected');
      const member = await admitMemberRemove(command, signingPublicKey);
      const { data, error } = await admin.schema('private').rpc('remove_vault_collection_member_and_rotate_epoch', {
        p_account_id: principal.user.id,
        p_session_id: principal.sessionId,
        p_device_id: command.authorDeviceId!,
        p_collection_id: command.collectionId!,
        p_expected_collection_head: encodePostgresBytea(command.expectedCollectionHead!),
        p_membership_id: member.membershipId,
        p_removed_account_id: member.recipientAccountId,
        p_epoch_number: member.epochNumber,
        p_membership_state_hash: encodePostgresBytea(member.membershipStateHash),
        p_recipient_set_commitment: encodePostgresBytea(member.recipientSetCommitment),
        p_transition_payload: encodePostgresBytea(member.transitionPayload),
        p_transition_signature: encodePostgresBytea(member.transitionSignature),
        p_transition_hash: encodePostgresBytea(member.transitionHash),
        p_device_envelopes: member.deviceEnvelopes.map(encodeSharingEnvelope),
        p_recovery_envelopes: member.recoveryEnvelopes.map(encodeSharingEnvelope),
        p_operation_id: command.operationId,
        p_command_payload: encodePostgresBytea(command.signedBytes),
        p_command_hash: encodePostgresBytea(await sha256(command.operationBytes)),
        p_command_signature: encodePostgresBytea(command.signature),
      });
      if (error || !data) return vaultCborError(409, 'member-remove-rejected');
      return vaultCborResponse(201, new Map<number, CborValue>([[1, command.operationId], [2, member.membershipId], [3, member.epochNumber]]));
    }

    if (admission.command.operationType === 'collection-create') {
      const creation = admitCollectionCreation(admission.command);
      const { command } = admission;
      const { data, error } = await admin.schema('private').rpc('create_vault_collection', {
        p_account_id: principal.user.id, p_session_id: principal.sessionId, p_device_id: command.authorDeviceId!, p_collection_id: creation.collectionId,
        p_expected_account_head: encodePostgresBytea(command.expectedAccountHead!),
        p_encrypted_metadata: encodePostgresBytea(creation.encryptedMetadata), p_metadata_nonce: encodePostgresBytea(creation.metadataNonce),
        p_membership_state_hash: encodePostgresBytea(creation.membershipStateHash), p_recipient_set_commitment: encodePostgresBytea(creation.recipientSetCommitment),
        p_transition_payload: encodePostgresBytea(creation.transitionPayload), p_transition_signature: encodePostgresBytea(creation.transitionSignature), p_transition_hash: encodePostgresBytea(creation.transitionHash),
        p_device_envelope_enc: encodePostgresBytea(creation.deviceEnvelope.encapsulation), p_device_envelope_ciphertext: encodePostgresBytea(creation.deviceEnvelope.ciphertext), p_device_envelope_payload: encodePostgresBytea(creation.deviceEnvelope.payload), p_device_envelope_signature: encodePostgresBytea(creation.deviceEnvelope.signature),
        p_recovery_key_id: creation.recoveryKeyId, p_recovery_envelope_enc: encodePostgresBytea(creation.recoveryEnvelope.encapsulation), p_recovery_envelope_ciphertext: encodePostgresBytea(creation.recoveryEnvelope.ciphertext), p_recovery_envelope_payload: encodePostgresBytea(creation.recoveryEnvelope.payload), p_recovery_envelope_signature: encodePostgresBytea(creation.recoveryEnvelope.signature),
        p_operation_id: command.operationId, p_command_payload: encodePostgresBytea(command.signedBytes), p_command_hash: encodePostgresBytea(await sha256(command.operationBytes)), p_command_signature: encodePostgresBytea(command.signature),
      });
      if (error || !data) return vaultCborError(409, 'collection-create-rejected');
      return vaultCborResponse(201, new Map([[1, command.operationId], [2, creation.collectionId]]));
    }

    if (admission.command.operationType === 'note-append') {
      const { command } = admission;
      const { data: author, error: authorError } = await userClient.from('vault_devices').select('signing_public_key')
        .eq('id', command.authorDeviceId!).eq('account_id', principal.user.id).eq('status', 'active').maybeSingle();
      if (authorError) throw authorError;
      const signingPublicKey = decodePostgresBytea(author?.signing_public_key);
      if (!signingPublicKey) return vaultCborError(422, 'note-append-rejected');
      const note = await admitNoteAppend(command, signingPublicKey);
      const { data, error } = await admin.schema('private').rpc('append_vault_note_revision', {
        p_account_id: principal.user.id, p_session_id: principal.sessionId, p_device_id: command.authorDeviceId!, p_collection_id: command.collectionId!,
        p_expected_account_head: encodePostgresBytea(command.expectedAccountHead!),
        p_expected_collection_head: encodePostgresBytea(command.expectedCollectionHead!), p_note_id: note.noteId, p_expected_previous_revision_hash: note.previousRevisionHash ? encodePostgresBytea(note.previousRevisionHash) : null, p_collection_epoch: note.collectionEpoch,
        p_encrypted_content: encodePostgresBytea(note.encryptedContent), p_content_nonce: encodePostgresBytea(note.contentNonce),
        p_wrapped_revision_key: encodePostgresBytea(note.wrappedRevisionKey), p_key_wrap_nonce: encodePostgresBytea(note.keyWrapNonce),
        p_ciphertext_hash: encodePostgresBytea(note.ciphertextHash), p_wrapped_revision_key_hash: encodePostgresBytea(note.wrappedRevisionKeyHash),
        p_revision_hash: encodePostgresBytea(note.revisionHash), p_revision_signature: encodePostgresBytea(note.revisionSignature),
        p_operation_id: command.operationId, p_command_payload: encodePostgresBytea(command.signedBytes),
        p_command_hash: encodePostgresBytea(await sha256(command.operationBytes)), p_command_signature: encodePostgresBytea(command.signature),
      });
      if (error) {
        console.error({
          requestId,
          endpoint: 'commands',
          stage: 'note-append-transaction',
          code: error.code,
        });
        return vaultCborError(503, 'command-service-unavailable');
      }
      if (!data) return vaultCborError(409, 'note-append-rejected');
      return vaultCborResponse(201, new Map([[1, command.operationId], [2, note.noteId]]));
    }

    if (admission.command.operationType === 'note-delete') {
      const { command } = admission;
      const deleted = admitNoteDelete(command);
      const { data, error } = await admin.schema('private').rpc('delete_vault_note', {
        p_account_id: principal.user.id, p_session_id: principal.sessionId, p_device_id: command.authorDeviceId!, p_collection_id: command.collectionId!,
        p_expected_account_head: encodePostgresBytea(command.expectedAccountHead!),
        p_expected_collection_head: encodePostgresBytea(command.expectedCollectionHead!), p_note_id: deleted.noteId,
        p_expected_revision_hash: encodePostgresBytea(deleted.expectedRevisionHash), p_operation_id: command.operationId,
        p_command_payload: encodePostgresBytea(command.signedBytes), p_command_hash: encodePostgresBytea(await sha256(command.operationBytes)),
        p_command_signature: encodePostgresBytea(command.signature),
      });
      if (error || !data) return vaultCborError(409, 'note-delete-rejected');
      return vaultCborResponse(201, new Map([[1, command.operationId], [2, deleted.noteId]]));
    }

    // No mutation is enabled until its command-specific private transaction is
    // implemented and tested. Never fall back to a browser table write.
    return vaultCborError(422, `operation-not-enabled:${admission.command.operationType}`);
  } catch (error) {
    if (error instanceof VaultHttpError && error.code) {
      return vaultCborError(error.status, error.code);
    }
    if (typeof error === 'object' && error && 'code' in error) {
      console.error({
        requestId,
        endpoint: 'commands',
        stage: 'database',
        code: String(error.code),
      });
      return vaultCborError(503, 'command-service-unavailable');
    }
    const code = error instanceof Error && /^(command-size|account-mismatch|inactive-author|invalid-signature|unbound-session|invalid-note-append)$/.test(error.message)
      ? error.message : 'invalid-command';
    return vaultCborError(code === 'command-size' ? 413 : code === 'unbound-session' ? 403 : 422, code);
  }
}
