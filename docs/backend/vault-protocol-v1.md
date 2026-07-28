# Vault protocol v1

## Status and authority

This is the normative v1 implementation contract for the ClipsX browser vault.
It applies to browser, Next.js route-handler, Supabase, and future desktop
implementations. Where it differs from an earlier illustrative algorithm or
open question in [architecture.md](architecture.md), this document wins.

V1 supports encrypted notes and login/password records, personal and shared
collections, device approval, recovery, revocation, conflicts, and browser
sync. File attachments and an independently witnessed transparency log are
explicitly out of scope.

## Security and account model

Supabase Google OAuth, email/password, and optional account passkeys establish
an account session. They do not decrypt the vault. A separate vault WebAuthn
credential or vault passphrase unlocks the browser device bundle.

Every initial vault enrollment creates a mandatory 32-byte recovery secret.
It is encoded as an English 24-word BIP-39 phrase and the user must confirm
randomly selected words before onboarding completes. There is no no-recovery
bootstrap and no extra passphrase for this recovery phrase.

The standard unlock profile is `webauthn-prf-wrapped` with `userVerification`
set to `required`. The browser creates a dedicated vault credential scoped to
the `clipsx.app` relying-party ID. It retains a random 32-byte PRF input,
credential ID, and bundle salt locally. The PRF output is used only in the
browser. A `vault-passphrase-wrapped` profile is the explicit fallback; the
direct `indexeddb-nonextractable` profile is not supported in v1.

An authenticated user may optionally store a `PasskeyRecoveryWrapper`: the
recovery secret encrypted under a distinct key derived from an eligible vault
credential's PRF output. This is convenience recovery only. If a synced or
cross-device passkey cannot reproduce the PRF result, the recovery phrase is
required. The server never receives the PRF output, unlock key, recovery
secret, or recovery private key in plaintext.

## Algorithm profile

| Purpose | V1 choice |
| --- | --- |
| Key delivery | RFC 9180 HPKE base mode: DHKEM(X25519, HKDF-SHA-256), HKDF-SHA-256, AES-256-GCM |
| Device and recovery signatures | Ed25519 |
| Content, key wrapping, local bundle, recovery wrapper | AES-256-GCM with fresh 96-bit random nonces |
| Hash and KDF | SHA-256 and HKDF-SHA-256 |
| Vault-passphrase KDF | scrypt: `N=131072`, `r=8`, `p=1`, 16-byte salt, 32-byte output |
| Recovery encoding | 32-byte entropy as a 24-word English BIP-39 phrase |
| Canonical serialization | RFC 8949 core deterministic CBOR |

V1 starts with `@hpke/core@1.9.0`, `@hpke/dhkem-x25519@1.8.0`,
`@noble/curves@2.2.0`, `@noble/hashes@2.2.0`, `@scure/bip39@2.2.0`,
`cborg@5.1.8`, and `zxcvbn@4.4.2`, plus Web Crypto for AES-GCM. Lock these
exact package versions in `package-lock.json`; do not substitute an algorithm,
package, or encoding mode without a new protocol version.

All key derivations use HKDF-SHA-256 with a protocol-versioned ASCII info label:

```text
clipsx/vault/v1/browser-unlock
clipsx/vault/v1/passkey-recovery-wrapper
clipsx/vault/v1/recovery-encryption-key
clipsx/vault/v1/recovery-signing-key
```

The key derivation context always includes the account ID, device or credential
ID where applicable, bundle/recovery version, and purpose. AAD always includes
the protocol version, algorithm ID, and the immutable identity of the object it
protects. Every AEAD nonce is generated with `crypto.getRandomValues()` and
never reused under its key.

## Canonical records and transport

All protocol records are definite-length deterministic CBOR maps. Field labels
are positive integers, allocated contiguously in the field order listed in the
record definition. Labels are never reused. Optional fields are omitted; an
empty value is not the same as an omitted value. Decoders reject duplicate map
keys, indefinite lengths, unknown required fields, unknown versions, non-minimal
integer encodings, and a record whose deterministic re-encoding differs from
the received bytes.

Signatures and hashes are calculated over:

```text
UTF-8(domain-label) || 0x00 || deterministic-CBOR(record-without-signature)
```

`VaultCommandV1` has these ordered fields:

1. `protocolVersion`
2. `operationId`
3. `operationType`
4. `accountId`
5. `authorDeviceId` or `recoveryKeyId`
6. `collectionId` when applicable
7. `expectedAccountHead` when applicable
8. `expectedCollectionHead` when applicable
9. `payload`
10. `signature`

The command domain label is `clipsx/vault/v1/command/<operationType>`. Valid
operations in v1 are `device-register`, `device-authorize`, `device-revoke`,
`recovery-rotate`, `collection-create`, `note-append`, `note-delete`,
`checkpoint-append`, `invitation-create`, `invitation-accept`,
`invitation-confirm`, `member-add`, `member-remove`, and `epoch-rotate`.

The browser sends commands to `POST /api/vault/commands` as
`application/cbor`. Successful results and sync pages are also canonical CBOR.
Responses use HTTP `401`, `403`, `409`, `413`, or `422` with a stable,
non-secret protocol error code. The route handler verifies session, active
device/recovery authority, canonical bytes, size, hash, and Ed25519 signature
before calling a single private database transaction. Browser clients have no
direct mutation grants.

`GET /api/vault/bootstrap` returns account/device/recovery heads. `GET
/api/vault/collections/{id}/sync?after=<sequence>` returns authorized
collection operations, ciphertext, envelopes, and tombstones in bounded CBOR
pages. The sequence is an availability cursor only; clients trust only verified
signed heads and local checkpoints.

## Encrypted item payloads

The encrypted revision payload uses one of two fixed maps:

| Item type | Fields in encrypted payload |
| --- | --- |
| `note` | schema version, type, title, body, labels, created-at, updated-at |
| `login` | schema version, type, name, username, password, URL, notes, labels, created-at, updated-at |

The item type, titles, labels, and all fields above remain inside the content
ciphertext. The server sees opaque item IDs, revision/epoch numbers, ciphertext
sizes, timing, author device ID, and unavoidable membership metadata. A note
revision ciphertext must not exceed 1 MiB.

Each revision receives a fresh random 32-byte content key. Content is encrypted
with the revision key; the revision key is encrypted with the collection epoch
key. The signed operation binds both ciphertext hashes, the parent revision
hash, the collection epoch, and the author device.

## Sharing, recovery, deletion, and locking

Verified invitations are mandatory. An invitation link contains its
high-entropy secret in a URL fragment, while the server stores only a
commitment. The inviter and recipient compare a QR transcript or grouped
20-digit safety number; both sign confirmation before membership activation or
epoch envelopes. New members receive only the joining epoch unless the owner
explicitly grants selected or all retained earlier epochs.

Removing a member or revoking a device creates a new epoch for every affected
collection, commits the removal/revocation and recipient set atomically, and
issues no later envelope to the removed recipient. This protects future writes;
it cannot erase keys or plaintext already learned.

On signed item deletion, remove its primary ciphertext and wrapped keys in the
same transaction and retain a signed non-secret tombstone. Backups and prior
recipient copies are not cryptographic erasure.

Lock on explicit lock, sign-out, 15 minutes of inactivity, and browser page
termination. Lock releases application references and clears rendered secrets;
it does not claim physical memory erasure. Offline cache and conflict drafts
remain locally encrypted. V1 has no service worker or background sync task.

## Compatibility and test vectors

The protocol fixture directory must contain deterministic fixtures for each
record type, key derivation, HPKE envelope, signature, encrypted note/login
revision, recovery wrapper, invitation confirmation, epoch rotation, tombstone,
and rejected malformed record. Fixtures use fixed test-only keys and nonces and
are never production material.

Every browser implementation must verify the fixtures before release. The
future desktop repository consumes the same CBOR bytes and tests. Legacy epoch
`0` migration fixtures are part of the contract, but no desktop migration code
is implemented in this repository.
