# Data model and column dictionary

## Status and conventions

The billing tables are implemented. Migration
`20260728064659_add_vault_read_schema.sql` and
`20260728073117_add_vault_trust_ledger.sql` implement core browser-readable
vault and trust-ledger tables as `public.vault_*` rows with RLS and no browser
mutation grants. The first signed collection-create transaction and its
collection-operation ledger are implemented; invitations, checkpoints, and
tombstones remain planned.
`20260728143159_add_vault_device_register_transaction.sql` adds the private,
all-or-nothing first-device registration and collection-create transactions;
the HTTP dispatcher validates and executes both command types. Other command
transactions remain pending.
Browser IndexedDB records remain local-only target records. The descriptions
below use logical names; implemented database names carry the `vault_` prefix.
Cryptographic
protocol names in the architecture use `camelCase` where they describe
canonical wire structures.

ClipsX's product term **saved item** maps to the cryptographic **note** entity.
The proposed physical names remain under the existing vault vocabulary:
`vault_notes` and `vault_note_revisions`. A collection is the membership and
key-rotation boundary. An `account_id` in the vault model identifies the
personal security principal backed by `auth.users`; it is not a
`billing_account_id`.

All application-owned mutable tables have `created_at timestamptz not null
default now()` and `updated_at timestamptz not null default now()`. Append-only
cryptographic tables have `created_at` but are not updated in place. Binary
public keys, signatures, hashes, encapsulations, nonces, and ciphertext are
stored as `bytea`, never encoded ambiguously as database text. IDs are UUIDs
unless a protocol profile specifies another fixed byte identifier.

All vault cryptography runs in the browser. The server schema stores public
keys, signed records, ciphertext, and access metadata. Browser-only records are
documented separately and are not Supabase tables.

## Schemas

| Schema | Purpose | Browser access |
| --- | --- | --- |
| `public` | Encrypted vault rows exposed for authorized reads | Explicit select grants plus RLS; no browser mutation grants |
| `private` | Stripe projection and accounting support | API-enabled for `service_role` only; no browser grants |

## Browser-local IndexedDB records

IndexedDB is the browser device's persistence layer, not a server database and
not a hardware-backed trust boundary. The vault origin uses a versioned
database separate from unrelated website state. Private key bytes, unlock keys,
PRF outputs, recovery secrets, collection keys, revision keys, and note
plaintext are never stored as unencrypted IndexedDB values.

### `browser_device_key_record` — local only

One record protects the persistent identity for one browser device:

| Field | Meaning |
| --- | --- |
| `device_id` | Matches the server `devices.id`; included in AEAD context. |
| `schema_version`, `bundle_format_version` | IndexedDB and canonical bundle decoder versions. |
| `protection_profile` | `webauthn-prf-wrapped` or `vault-passphrase-wrapped`. |
| `encrypted_device_key_bundle` | AEAD ciphertext containing the serialized device private-key bundle. |
| `bundle_nonce` | Nonce for the selected bundle AEAD. |
| `wrapping_algorithm`, `kdf_algorithm`, `kdf_version` | Complete local unlock/decoder profile. |
| `webauthn_credential_id`, `webauthn_rp_id`, `prf_input` | Non-secret local inputs for the WebAuthn PRF profile; never copied into the server device row. |
| `password_kdf_salt`, `password_kdf_parameters` | Salt and calibrated memory/time/parallelism values for the passphrase profile only. |
| `public_key_commitment` | Hash commitment to the public keys in the corresponding server device record, checked after every unlock. |
| `created_at`, `rewrapped_at` | Local lifecycle metadata. |

Profile-specific constraints prohibit mixing WebAuthn and password inputs.
`encrypted_device_key_bundle`, its nonce, algorithm/version, and contextual AAD
must be present together. A profile may change only by decrypting in an already
unlocked session and atomically writing a newly encrypted bundle; interruption
must leave the prior record recoverable. The record is never synced, backed up
to Supabase, placed in Cache Storage, or copied to another browser device.
The relying-party ID is `clipsx.app`, with vault operations confined to the
approved `/[locale]/vault` route. Changing it requires new-device enrollment
rather than local record mutation.

The currently implemented canonical `BrowserDeviceKeyBundle` exists only
transiently in memory and contains the separate X25519 encryption and Ed25519
signing private key bytes plus its format version. It contains no account
password, recovery phrase, or recovery private key. Draft/cache keys,
checkpoint-authentication keys, public-key commitments, and lifecycle metadata
are planned additions before those browser features are enabled. After
validation, private keys will be imported as non-extractable `CryptoKey`
objects where supported and the serialized bytes released.

### `browser_security_checkpoints` — local only

Records the highest authorization-log, collection-operation, membership,
epoch, and note revision heads previously accepted by this browser device.
Fields include `device_id`, `log_type`, optional `collection_id`/`note_id`,
`sequence_number`, `head_hash`, `authenticated_record`, `protocol_version`, and
`updated_at`. Integrity is bound to a device signing key or a local
authentication key protected inside the device bundle. A server response may
advance this record but never decrease or silently replace it.

### `browser_encrypted_drafts` — local only

Conflicting/offline drafts, when supported, are AEAD-encrypted under a local
draft/cache key protected by the device bundle. Fields include draft ID, note
and collection IDs, base revision hash, ciphertext, nonce, algorithm/version,
and updated time. Lock removes decrypted draft state. IndexedDB eviction may
lose unsynchronized drafts, so the UI must not claim durable sync until a
signed note revision is accepted by the server.

## Server encrypted-vault entities

### `private.vault_device_registration_challenges`

Server-only, short-lived enrollment proof state. It binds an authenticated
account to a proposed device encryption public key and stores only the SHA-256
hash of a random challenge, expiry, and consumption time. The server returns
the challenge only as an HPKE ciphertext addressed to the proposed device; the
client returns its hash after local decryption. This is not a vault secret and
expires after the one-time enrollment attempt. Its `updated_at` field records
challenge consumption for operational audit without retaining the raw challenge.

### `devices` — Device

One immutable cryptographic device identity. Reinstallation or cryptographic
key replacement—or loss of that browser profile's IndexedDB—creates a new row
rather than overwriting public keys.

| Column | Meaning |
| --- | --- |
| `id` | Device ID included in signed and authenticated context. |
| `account_id` | Owning personal security account (`auth.users`). |
| `display_name` | User-visible device label; server-visible metadata. |
| `client_type` | `browser` for this architecture. |
| `platform` | Browser/OS compatibility label used for support, not trust. |
| `enrollment_origin` | Canonical vault origin that created the device; informational and signature-bound, not proof that future JavaScript is trusted. |
| `key_protection_profile` | Claimed local profile: `webauthn-prf-wrapped` or `vault-passphrase-wrapped`; non-secret capability metadata, not a server-enforced guarantee. |
| `client_crypto_capabilities` | Versioned non-secret set of supported protocol suites and browser features; its canonical hash is bound into `DeviceAuthorization`. |
| `encryption_public_key` | Device envelope recipient public key. |
| `signing_public_key` | Separate operation-signing public key. |
| `encryption_algorithm` | Named key-agreement/HPKE suite identifier. |
| `signing_algorithm` | Named signature algorithm identifier. |
| `key_version` | Protocol key version; never inferred from key length. |
| `status` | `pending`, `active`, or `revoked`. |
| `auth_session_id` | Current Supabase session binding used by RLS/RPC access checks. Initial registration sets it; a signed `device-session-bind` operation replaces it after later account sign-in. |
| `created_at`, `last_seen_at` | Enrollment and activity metadata. |
| `revoked_at`, `revocation_reason` | Terminal revocation audit fields. |

Private keys have no database columns. Public-key and algorithm columns become
immutable once the device is active. State is `pending -> active -> revoked`;
`revoked` cannot return to `active`.

No server column stores `encrypted_device_key_bundle`, WebAuthn credential ID,
PRF input/output, browser unlock key, vault passphrase, or password-KDF
parameters. Those values are local to the browser profile. The server must not
infer stronger assurance solely from the self-reported protection profile or
capability set, and must not use either to authorize a cryptographic downgrade.

Required constraints include unique `(account_id, id)`, nonempty and distinct
encryption/signing keys, supported algorithm/version tuples, `revoked_at`
present only and always for `revoked`, and at most one active session binding
per Auth session. A partial index supports active devices by account.

### `device_authorizations` — DeviceAuthorization

Append-only certificate record that activates a pending device.

| Column | Meaning |
| --- | --- |
| `id` | Authorization record ID. |
| `account_id`, `device_id` | Account and exact pending device being authorized. |
| `authorized_by_device_id` | Active authorizing device, when device-authorized. |
| `recovery_key_id` | Active recovery signing key, when recovery-authorized. |
| `authorization_method` | `qr`, `short-auth-string`, `out-of-band`, or `recovery`. |
| `authorization_payload` | Exact deterministic-CBOR `DeviceAuthorization` payload defined in `architecture.md`. |
| `authorization_payload_hash` | Domain-separated hash used in log/checkpoint structures. |
| `proof_of_possession_payload`, `proof_of_possession_signature` | Canonical signing/encryption possession transcript and the new device's required 64-byte Ed25519 signature over it. |
| `signature` | Authorizer signature over the canonical authorization payload. |
| `created_at` | Signed creation time and append time. |

Exactly one authorizer type is required. V1 requires a recovery-root signature
for the first device. Thereafter, the authorizer must be active at the preceding
authorization-log position, or the recovery key must be active. A unique
`device_id` prevents multiple ambiguous activation certificates. Authorization
is accepted only after both private-key possession proofs verify.

### `recovery_keys` — RecoveryKey

Versioned public recovery root. No recovery secret, recovery private key,
password-derived material, or plaintext backup appears in this model.

| Column | Meaning |
| --- | --- |
| `id`, `account_id` | Recovery key identity and owner. |
| `encryption_public_key`, `signing_public_key` | Separate recovery public keys derived locally from the high-entropy recovery secret. |
| `encryption_algorithm`, `signing_algorithm` | Named reviewed algorithms. |
| `key_version` | Monotonic recovery-key version per account. |
| `status` | `active` or `revoked`. |
| `authorization_payload`, `authorization_signature` | Canonical version/root record and signature by the preceding valid root and active device when rotating. |
| `created_at`, `revoked_at` | Lifecycle audit values. |

There is at most one active recovery key per account, unique
`(account_id, key_version)`, and key versions never decrease. The initial
public-key fingerprint is confirmed/pinned by the creating browser. Revocation
is terminal and cannot erase epochs already decrypted with the old secret.

### `passkey_recovery_wrappers`

Optional convenience recovery ciphertext. It never contains an unlock key,
PRF result, or plaintext recovery material.

| Column | Meaning |
| --- | --- |
| `id`, `account_id`, `recovery_key_id` | Wrapper identity, owner, and covered active recovery version. |
| `webauthn_credential_id`, `webauthn_rp_id`, `prf_input`, `bundle_salt` | Non-secret credential/context data required to request the local PRF result. |
| `encrypted_recovery_secret`, `nonce` | Recovery secret encrypted under the domain-separated PRF-derived key. |
| `algorithm`, `key_version`, `protocol_version` | Exact decoder and protocol profile. |
| `created_at`, `revoked_at` | Enrollment and terminal revocation audit values. |

The table is reserved for a future optional convenience feature and is not
populated by the shipped v1 browser vault. If enabled later, it must be bound
to the current recovery key version and is never accepted as proof that
recovery is available. Recovery always falls back to the mandatory offline
phrase.

### `account_operations`

Append-only signed account trust history for device session binding,
authorization, revocation, and recovery-root rotation. Passkey-recovery wrapper
lifecycle remains reserved for a future feature.

| Column | Meaning |
| --- | --- |
| `operation_id`, `account_id`, `sequence_number` | Idempotent operation identity and monotonic account-log position. |
| `operation_type`, `canonical_payload` | V1 command type and deterministic-CBOR bytes. |
| `previous_operation_hash`, `operation_hash` | Hash-linked account trust history. |
| `author_device_id`, `recovery_key_id`, `signature` | Exactly one signing authority and its signature. |
| `protocol_version`, `created_at` | Protocol selection and append time. |

Unique `(account_id, sequence_number)`, unique `operation_id`, and unique
`operation_hash` apply. The row is inserted only by the private vault-command
transaction after route-handler signature verification.

### `collections`

Collection identity, encrypted presentation metadata, and current cryptographic
head. It contains no plaintext collection key.

| Column | Meaning |
| --- | --- |
| `id`, `owner_account_id` | Collection and original owner identity. |
| `encrypted_metadata`, `metadata_nonce` | AEAD-protected display metadata where present. |
| `metadata_algorithm`, `metadata_key_version`, `associated_data_version` | Decoder/protocol selection. |
| `current_epoch_number` | Monotonic epoch accepted for new writes. |
| `current_epoch_transition_hash` | Client-verifiable signed epoch head. |
| `membership_log_head_hash` | Client-verifiable signed membership head. |
| `crypto_format` | `legacy-shared-key`, `epoch-revision-key`, or an explicit future format. |
| `migration_state` | `legacy`, `dual-read`, `epoch-write`, or `complete`. |
| `highest_migrated_revision` | Optional migration progress marker; not proof that the server decrypted anything. |
| `created_at`, `deleted_at` | Lifecycle metadata. |

`current_epoch_number` may only advance through the epoch-transition RPC. It
never decreases, and a superseded epoch cannot be made current again.

### `collection_memberships` — CollectionMembership

Append-aware membership state. Historical access is never implicit.

| Column | Meaning |
| --- | --- |
| `id` | Immutable membership-lifecycle ID. |
| `collection_id`, `account_id` | Collection and member security account. |
| `role` | `owner`, `editor`, or `viewer`. |
| `status` | `invited`, `active`, or `removed`. |
| `joined_at`, `removed_at` | Membership lifecycle times. |
| `joined_epoch`, `removed_epoch` | Epoch boundaries for cryptographic access. |
| `history_access_from_epoch` | Earliest epoch the member may receive; defaults to `joined_epoch`. |
| `invited_by_device_id` | Device that signed the invitation/membership operation. |
| `membership_operation_id` | Signed operation establishing the current state. |

Unique `(collection_id, account_id, joined_epoch)` identifies one membership
lifecycle, and a partial uniqueness constraint permits at most one `invited` or
`active` lifecycle for an account in a collection. Removal is terminal;
rejoining creates a new membership ID and joined epoch.
`history_access_from_epoch <= joined_epoch`; it is never defaulted to epoch
`1`. `removed_epoch` is required on removal and is the first new epoch the
member may not receive (the epoch created by the removal rotation). A member
may receive an envelope only for epochs at or after
`history_access_from_epoch` and strictly before `removed_epoch`; the joining
epoch is allowed as defined by the signed addition transition.

### `collection_key_epochs` — CollectionKeyEpoch

Append-only public metadata for a collection epoch. The epoch key is never a
column.

| Column | Meaning |
| --- | --- |
| `id`, `collection_id`, `epoch_number` | Epoch identity; numbers are monotonic per collection. |
| `created_by_device_id`, `created_at` | Active device and signed time that created it. |
| `rotation_reason` | `collection-created`, `member-added`, `member-removed`, `device-revoked`, `suspected-compromise`, `scheduled`, `algorithm-upgrade`, or `recovery`. |
| `previous_epoch_hash` | Hash of preceding canonical transition; absent only for the first non-legacy epoch. |
| `membership_state_hash` | Signed commitment to membership state for this epoch. |
| `recipient_set_commitment` | Commitment to the complete intended device/recovery envelope set. |
| `transition_payload` | Deterministic-CBOR epoch-transition payload. |
| `transition_signature` | Creator device signature over the transition payload. |
| `algorithm`, `key_version`, `protocol_version` | Symmetric key-wrap and protocol profile identifiers. |
| `state` | Derived/guarded state: `created`, `current`, or `superseded`. |

Unique `(collection_id, epoch_number)` and unique transition hash prevent
ambiguous epochs. Epoch `n` must reference the accepted transition hash for
`n-1`, except a documented migration from legacy epoch `0`. Only one epoch per
collection is current. State advances `created -> current -> superseded` and
never reverses.

### `device_epoch_envelopes` — DeviceEpochEnvelope

Append-only HPKE or equivalent delivery of one epoch key to one authorized
device.

| Column | Meaning |
| --- | --- |
| `id`, `collection_id`, `epoch_number` | Envelope and covered epoch. |
| `recipient_device_id`, `sender_device_id` | Exact receiver and active creator. |
| `encapsulation` | HPKE encapsulated key or standard construction equivalent. |
| `ciphertext` | Authenticated encrypted epoch key. |
| `nonce` | Present only when required by the selected construction. |
| `algorithm`, `key_version`, `protocol_version` | Complete decoder/suite selection. |
| `envelope_payload`, `envelope_payload_hash`, `signature` | Exact canonical envelope bytes, their hash, and sender-device signature. The payload is retained so recipients verify the precise signed bytes rather than reconstructing them. |
| `created_at` | Append time included in signed context where protocol-defined. |

Unique `(collection_id, epoch_number, recipient_device_id, key_version)`
prevents multiple ambiguous envelopes. A deferred constraint/transactional RPC
requires the recipient device to be active, authorized, and covered by an
active membership for that epoch. No revoked device may receive an envelope
for a later epoch. The sender must be active and authorized at the transition
log position.

### `recovery_epoch_envelopes` — RecoveryEpochEnvelope

Append-only delivery of one epoch key to an eligible member account's active
recovery key.

| Column | Meaning |
| --- | --- |
| `id`, `collection_id`, `epoch_number`, `recovery_key_id` | Envelope context and recipient. |
| `sender_device_id` | Active epoch creator. |
| `encapsulation`, `ciphertext`, `nonce` | Standard hybrid-encryption output. |
| `algorithm`, `key_version`, `protocol_version` | Complete suite/profile selection. |
| `envelope_payload`, `envelope_payload_hash`, `signature` | Exact canonical envelope bytes, their hash, and creator signature, also covered by the epoch recipient-set commitment. |
| `created_at` | Append time. |

Unique `(collection_id, epoch_number, recovery_key_id, key_version)` applies.
The recovery key must be active, recovery must be enabled for that account, and
the account must have access to the collection at that epoch. Canonical AAD
binds account, collection, epoch, recovery key ID/version, algorithm, and
recovery-envelope purpose. Removed members receive no recovery envelope for a
later epoch.

### `vault_notes` — Note

Non-revision identity and current accepted head only. It contains no plaintext
note content.

| Column | Meaning |
| --- | --- |
| `id`, `collection_id` | Note identity and authorization/key boundary. |
| `created_at`, `created_by_device_id` | Creation audit fields. |
| `current_revision` | Highest accepted linear revision number. |
| `current_revision_hash` | Hash of the accepted immutable revision. |
| `deleted_at` | Optional deletion marker after a signed delete operation. |

The current head changes only through the optimistic-concurrency RPC that
atomically inserts a revision whose signed parent matches the prior head.

### `vault_note_revisions` — NoteRevision

Immutable authenticated ciphertext for one note revision.

| Column | Meaning |
| --- | --- |
| `id`, `note_id`, `collection_id`, `revision_number` | Immutable revision identity. |
| `collection_epoch` | Exactly one epoch whose key wraps this revision key. |
| `encrypted_content`, `content_nonce` | AEAD ciphertext and nonce. |
| `wrapped_revision_key`, `key_wrap_nonce` | Fresh revision key encrypted by the referenced epoch key. |
| `encryption_algorithm`, `key_wrap_algorithm` | Named AEAD/wrap algorithms. |
| `key_version`, `protocol_version`, `associated_data_version` | Cryptographic decoder and canonical-context versions. |
| `previous_revision_hash` | Signed hash link to the accepted parent; absent only for revision `1`. |
| `ciphertext_hash`, `wrapped_revision_key_hash`, `revision_hash` | Integrity/log-link values over canonical bytes. |
| `author_device_id`, `author_signature` | Active author and signature over the canonical modifying operation. |
| `operation_id`, `operation_type` | Globally unique idempotency ID and `create`, `update`, `merge`, or `delete`. |
| `created_at`, `logical_clock` | Signed ordering metadata; neither alone establishes freshness. |

Required uniqueness is `(note_id, revision_number)` plus unique
`operation_id`. `collection_id` must match the parent note. Revision `n` must
equal the locked note head plus one and reference its `revision_hash`;
revision numbers never decrease. The collection epoch must be the current
accepted epoch when the operation commits. All ciphertext/key hashes,
signature, author authorization, nonce lengths, algorithm/version tuples, and
canonical AAD are validated before advancing the note head.

ClipsX uses optimistic concurrency, not silent last-write-wins and not a CRDT.
Only one concurrent candidate can satisfy the atomic parent/head check. A
losing candidate remains a local encrypted draft, receives a conflict result,
and is rebased or merged into a newly signed revision after the accepted head
is verified. It is not inserted under the same revision number and is never
silently overwritten. The product does not claim automatic merge safety.

### `collection_invitations` — Invitation

| Column | Meaning |
| --- | --- |
| `id`, `collection_id`, `inviter_device_id` | Invitation identity, collection, and signing device. |
| `recipient_account_id`, `recipient_identity` | Known account or opaque delivery identity; minimize plaintext identity data. |
| `verification_mode` | Always `verified` in v1; the field remains explicit to reject unsupported future modes. |
| `status` | `created`, `accepted`, `expired`, or `cancelled`. |
| `expires_at`, `accepted_at`, `accepted_by_device_id` | Lifecycle and accepting active device. |
| `invitation_key_commitment`, `verification_commitment` | Domain-separated commitments to any server-unknown invitation secret and canonical verification transcript. |
| `invitation_payload`, `inviter_signature` | Canonical invitation and inviter-device signature. |
| `created_at` | Signed creation/append time. |

No high-entropy invitation secret intended to resist server substitution is
stored in plaintext or sent in a server-visible URL/query/body. State is
`created -> accepted | expired | cancelled`; terminal states do not reactivate.
Acceptance requires a valid, unexpired commitment and an authorized recipient
device. Unique commitments prevent replay across invitations.

### `collection_operations`

Append-only signed history for membership, invitation, epoch, note-head,
revocation-reference, and checkpoint operations. The current implementation
stores the initial `collection-create` entry; later operation types remain
reserved until their corresponding transaction is implemented.

| Column | Meaning |
| --- | --- |
| `operation_id`, `collection_id`, `sequence_number` | Idempotent operation and monotonic collection-log position. |
| `operation_type`, `canonical_payload` | Versioned operation type and deterministic-CBOR bytes. |
| `previous_operation_hash`, `operation_hash` | Hash-linked append-only history. |
| `author_device_id`, `signature` | Device authorship. |
| `protocol_version`, `created_at` | Protocol and ordering metadata. |

Unique `(collection_id, sequence_number)`, unique `operation_id`, and unique
`operation_hash` apply. An insert must extend the locked head; existing rows
cannot be updated or deleted through normal APIs.

### `security_checkpoints`

Signed, server-stored copies of device authorization, collection membership,
epoch, and note heads used for cross-device comparison. Clients also retain
their highest-seen checkpoints locally; server rows cannot replace a higher
local checkpoint.

Fields include `id`, `account_id`, optional `collection_id`, `log_type`,
`sequence_number`, `head_hash`, `device_id`, `checkpoint_payload`, `signature`,
`protocol_version`, and `created_at`. Unique
`(device_id, log_type, collection_id, sequence_number)` applies.

### `vault_tombstones`

Preserves the existing saved-item sync concept after product-policy deletion.
Fields include `note_id`, `collection_id`, `deleted_by_device_id`,
`delete_operation_id`, `last_revision_hash`, and `deleted_at`. The delete
operation is signed. Ciphertext and wrapped keys may be removed according to
retention policy, but the model does not claim deletion from recipient devices,
backups, or prior exports is cryptographic erasure.

## State transitions

| Entity | Allowed transitions | Prohibited behavior |
| --- | --- | --- |
| Device | `pending -> active -> revoked` | Reactivating a revoked ID or replacing its keys in place |
| Invitation | `created -> accepted`, `created -> expired`, `created -> cancelled` | Accepting an expired/cancelled invitation or returning to `created` |
| Membership | `invited -> active -> removed` | Reactivating removed access without a new invitation, membership lifecycle, and epoch |
| Collection epoch | `created -> current -> superseded` | Decreasing/reusing an epoch or restoring a superseded key |
| Recovery key | `active -> revoked` with a new higher version becoming active | Re-enabling an old recovery root |

Transitions that could restore cryptographic access require new IDs where
applicable, new key material, signatures rooted in current trust, and a new
collection epoch.

## Cross-table constraints and transaction boundaries

Some security invariants span tables and cannot be expressed as simple check
constraints. `POST /api/vault/commands` verifies canonical CBOR and Ed25519
signatures, then calls narrow private transaction functions with pinned
`search_path`, restricted execution grants, row locks, and one transaction. The
transactions must enforce:

- authorization activation only after possession proofs and authorizer
  signature verification;
- append-only operation, membership, and epoch histories;
- exactly one current collection epoch;
- an epoch recipient set exactly matching eligible active devices plus allowed
  recovery keys;
- no envelopes to revoked devices, removed members, or epochs before a
  member's `history_access_from_epoch`;
- member removal plus new epoch/envelopes committed before any later note;
- monotonic note head and exact signed parent/hash checks;
- signature/algorithm/AAD validation before accepting key-bearing data; and
- idempotency by signed operation ID.

`private.append_vault_note_revision` is the implemented first-write boundary.
It locks the current `collection_operations` row, compares the command's
expected head, checks active owner/editor membership, the device's current Auth
session binding, and the collection epoch, then inserts `notes`, immutable
revision `1`, and the next operation row in one transaction. Duplicate note or
operation IDs and any failed validation leave no partial rows.

Later revisions additionally require the note's exact current revision hash;
this is the optimistic-concurrency boundary for encrypted item updates.

The collection sync route reads the existing RLS-protected operation and
revision tables. It returns canonical CBOR, never plaintext; a browser worker
uses `canonical_payload`, operation hashes/signatures, and revision evidence to
verify and decrypt only current personal-device records.

RLS still checks account, active device, live Auth session, membership, and
role for all browser-readable data. Browser mutation grants are revoked. RLS
and TLS are server access controls, not cryptographic public-key authentication
or browser-vault unlock. The server never receives enough data to reconstruct
the browser device-key bundle.

Indexes include active device/account lookup, active
collection-membership/account lookup, current epoch per collection, envelope
lookup by recipient and epoch, note sync by `(collection_id, revision_number,
created_at)`, pending invitations by recipient/expiry, and append-log lookup by
collection/sequence. Indexes expose metadata and must not include plaintext
titles or note bodies.

## Server-visible and prohibited data

The server may see account/device IDs, device public keys, collection
membership and roles, epoch/revision numbers, author device IDs, ciphertext
sizes, note counts, timing, access patterns, and any deliberately unencrypted
content type/title/label. It stores signed operations, ciphertext, wrapped
keys, envelopes, public keys, commitments, and non-secret indexes.

The schema has no plaintext fields for device private keys, recovery secrets or
private keys, collection epoch keys, note revision keys, note bodies, decrypted
attachments, or avoidable sensitive metadata. `passkey_recovery_wrappers` may
contain ciphertext of recovery entropy but never the secret itself. These
values must also be
excluded from database errors, logs, analytics, telemetry, and crash reports.
It also has no fields for the browser device-key bundle, WebAuthn PRF output,
browser unlock key, vault passphrase, or decrypted local draft/cache key.

## Billing and plans

| Table | Important columns and meaning |
| --- | --- |
| `plans` | `id`: internal immutable ID; `code`: stable product code (`free`, `pro`); `display_name`: UI label; `active`: whether new assignments are allowed. |
| `plan_features` | `plan_id`: owner plan; `feature_key`: stable capability name; `value_jsonb`: typed configurable limit or boolean. This prevents feature limits from being scattered through code. |
| `billing_accounts` | `id`: billing owner ID; `kind`: `personal` now, `organization` later; `owner_user_id`: creator/owner; `status`: active or closed. Every user has one personal account. |
| `organizations` | `id`: future Team workspace identity; `name`: display name; timestamps: audit and lifecycle. An organization will own exactly one organization-kind billing account. |
| `organization_memberships` | `organization_id`, `user_id`: workspace access; `role`: owner/admin/member; `status`: active or removed. Only active owners/admins may start future Team Checkout or open its Billing Portal. This is distinct from encrypted collection membership. |
| `billing_customers` | `billing_account_id`: local owner; `stripe_customer_id`: stable Stripe identity; `livemode`: prevents test/live collisions; `stripe_deleted_at`: Stripe deletion marker. Email is not the identity key. |
| `billing_products` | `stripe_product_id`: Stripe Product; `plan_id`: ClipsX plan represented by that Product; `name`, `description`, `active`: display/catalog state; `stripe_created_at`, `stripe_event_created_at`: source timing. |
| `billing_prices` | `stripe_price_id`: immutable commercial version; `product_id`: parent Product; `lookup_key`: stable deployment-safe handle; `currency`, `unit_amount`, `recurring_interval`, `interval_count`: what is charged; `active`: sale eligibility; `tax_behavior`: future tax configuration. |
| `billing_subscriptions` | `stripe_subscription_id`: Stripe lifecycle object; `billing_account_id`, `customer_id`: local ownership; `status`: Stripe status; `billing_cycle_anchor`: stable cycle reference; `cancel_at_period_end`, `cancel_at`, `canceled_at`, `ended_at`: cancellation semantics; `trial_start`, `trial_end`: trial window; `pause_collection_behavior`, `pause_collection_resumes_at`: payment-collection pause state, distinct from Stripe's `paused` status. |
| `billing_subscription_items` | `stripe_subscription_item_id`: item identity; `subscription_id`: parent; `price_id`: selected billing variant; `quantity`: future seat-compatible quantity; `current_period_start`, `current_period_end`: access/billing period, held at Stripe item level. |
| `billing_invoices` | `stripe_invoice_id`: invoice identity; `billing_account_id`, `subscription_id`: association; `status`, `amount_due`, `amount_paid`, `currency`, `paid_at`, `next_payment_attempt`: dunning/support information. No payment-method details are copied. |
| `billing_webhook_events` | `stripe_event_id`: idempotency key; `event_type`, `object_type`, `object_id`: routing; `livemode`: environment boundary; `stripe_event_created_at`: source ordering; `processing_state`, `attempts`, `last_error`, `processed_at`: durable delivery audit; `locked_at`, `locked_by`, `lease_expires_at`: short webhook-processing lease that prevents concurrent delivery from acknowledging uncommitted work. |
| `account_entitlements` | `billing_account_id`: one current access record; `plan_id`: effective plan; `source_subscription_id`: Stripe-derived origin; `status`: active, grace, or read-only; `effective_from`, `paid_through`, `grace_until`: authorization timeline. |
| `ai_allowance_periods` | Reserved for a future AI allowance feature. It will hold `billing_account_id`, plan/item basis, monthly window, granted/consumed capacity, and an idempotency key. It is not populated or enforced in v1. |
| `ai_usage_events` | Reserved future usage ledger: account payer, optional Team actor, allowance window, idempotency key, event kind, and signed unit delta. It is not populated or enforced in v1; prompts and AI output will never be stored. |

### Why `billing_account_id` exists

Today it means "this user's personal billing account." In the future, a Team
can own an organization account and subscriptions/allowances can move to that
account without rewriting subscriptions, invoices, or usage history.
Organizations and membership roles are present as a foundation; Team Checkout,
seats, pooled allowances, and member-management UI are intentionally not yet
implemented.

### Existing billing constraints and indexes

- Unique personal billing account per user and unique Stripe IDs per `livemode`.
- Unique subscription item and webhook event IDs per `livemode`.
- Unique allowance period for one billing account and monthly time window.
- Unique AI event identity for a request and event kind.
- Foreign keys from every Stripe projection child to its local parent where the
  relationship is known; deletion is restricted, not cascaded through history.
- Partial indexes for active subscriptions/entitlements and pending webhook
  events.
- Check constraints for allowed states, nonnegative quantity, nonnegative
  allowance totals, and valid time ranges.

## Legacy migration representation

Legacy collections are identified by `crypto_format = legacy-shared-key` and
treat that key as epoch `0`. `migration_state` distinguishes untouched,
dual-read, new-write, and complete states. Each migrated revision records the
new epoch/AAD/protocol version and a signed link to the legacy ciphertext hash.
Only an unlocked authorized browser device performs migration. No server column
or job requires plaintext, and deleting the legacy envelope is not described as
erasing a key from old browser devices.

## V1 data-model decisions and deferred work

- Signed deletion removes primary revision ciphertext/wrapped keys immediately
  and retains a non-secret tombstone. Superseded revisions remain until note or
  collection deletion; neither policy claims cryptographic erasure from backups
  or recipients.
- Rejected concurrent drafts remain encrypted and local until the user merges
  them; there is no server-side candidate table.
- The exact cryptographic suite, deterministic-CBOR profile, and compatibility
  behavior are frozen in [Vault protocol v1](vault-protocol-v1.md).
- V1 stores signed local/device checkpoints and compares them during device or
  invitation verification. An independently witnessed transparency service is
  deferred.
- Attachments and object-storage tables are deferred; no upload path is enabled.
- V1 supports PRF-wrapped bundles and the scrypt passphrase fallback only. The
  supported-browser matrix and PRF capability checks are part of the launch
  test suite; direct non-extractable key persistence is excluded.
- Vault unlock uses a dedicated local credential, separate from optional
  Supabase account passkeys. PRF outputs are never serialized to a server. The
  optional passkey-recovery wrapper is deferred; its table is reserved but has
  no v1 browser command or UI.
- IndexedDB eviction is a lost-device event; bundle rewrap is atomic, tabs use
  a lock broadcast, and v1 has no service worker/background sync while the
  vault can be unlocked.
