# Vault flow review and operating guide

This guide describes implemented vault v1 behavior. The normative record and
wire format remain [Vault protocol v1](vault-protocol-v1.md).

## Lifecycle matrix

| Transition | Trust and secret boundary | Why it is required | Failure / safe recovery |
| --- | --- | --- | --- |
| Account session | Authenticated account may request its ciphertext; it has no vault private key. | Prevents cross-account access without making an account login a vault key. | Sign in again; never create a device from an unauthenticated state. |
| Enrollment inspection | Browser checks IndexedDB, active server devices, and the status of the saved local device. | Chooses first-device setup versus pending/new-device approval; avoids competing roots and rejects stale local records after a reset or revocation. | Stop setup on inspection failure; remove a stale encrypted local record before enrolling again. |
| Recovery phrase | Browser creates 256-bit recovery entropy; phrase and derived private keys never leave browser memory. | The offline root can recover after every device is lost. | Record it offline. Loss of all devices and phrase is unrecoverable. |
| Recovery-phrase notice | Browser displays the generated phrase and explains the loss risk. | Makes the required offline recovery root visible before setup; the UI does not claim to verify safe storage. | Store the phrase offline before continuing. |
| Local protection | WebAuthn PRF output or scrypt passphrase wraps the IndexedDB device bundle. | A copied browser database alone cannot expose device private keys. | Use the passphrase fallback when PRF is unavailable; retries remain local. |
| Device challenge | Server HPKE-encrypts a random 32-byte challenge to the proposed device public key and stores only its hash for five minutes. | Proves possession of the proposed encryption private key and prevents replay/precomputation. | Retry with a new challenge; inspect request ID for service/configuration errors. |
| First registration | Recovery key signs bootstrap; device key signs proof; transaction creates root, active device, and first operation. | The server cannot create a trusted device merely from account login. | Correct validation/origin/session failure and start over with a new challenge. |
| Local persistence | Browser stages only the encrypted bundle and non-secret metadata, then marks it active after registration. | Private device keys remain local while an uncertain server response remains recoverable. | Reconcile `registering` state against enrollment status; never create a competing root. |
| Unlock and verified sync | Worker decrypts device keys locally, verifies the paginated account ledger and signer directory, and then opens bootstrap only at the verified head. | Detects rollback or signer substitution before opening ciphertext for the local device. | Lock/retry locally; an account session alone cannot decrypt ciphertext. |
| Read/write | Browser verifies, decrypts, encrypts, and signs; server stores ciphertext, signatures, and public metadata. | Maintains E2EE and detects stale/conflicting writes. | Refresh verified state and merge local drafts after update conflicts. |
| Lock | Worker stops and UI clears plaintext; tabs receive lock broadcast. | Reduces exposure of live decrypted material. | Unlock again with the local protector. |
| Additional device | Proposed browser remains pending; trusted device verifies QR/SAS and sends encrypted envelopes. | Stops an account takeover from silently adding a reader. | Restart expired/cancelled offers; compare SAS out of band. |
| Phrase recovery | Phrase derives recovery keys locally and authorizes a new device. | Provides last-resort access without server-held recovery keys. | Warn when no independent checkpoint survives; revoke lost devices and rotate if compromise is suspected. |
| Revocation/rotation | Authorized actor creates next epochs only for remaining recipients. | Prevents revoked recipients from decrypting future writes. | It cannot erase data already copied by the removed device. |

## Diagnostics and deployment

Every CBOR vault response carries `X-Vault-Request-Id`. Support must request
that ID, never recovery words, passphrases, PRF output, private keys, raw
challenges, or encrypted bundle contents. The first-device UI maps
authentication, request, service, and configuration errors to safe action
messages and includes the request ID when supplied by the server.

Before deployment, rebuild and test all feature migrations, deploy matching
generated database types, and set `NEXT_PUBLIC_SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, and `VAULT_ENROLLMENT_ORIGINS`. Do not grant
browser roles access to private vault tables or transaction functions.

## Implemented compatibility and limitations

Current desktop Chrome and Edge use PRF when a valid authenticator result is
returned; Firefox and Safari must show or use the supported passphrase
fallback when PRF is unavailable. Mobile certification, full phrase-recovery
UI, and inactivity-lock enforcement are not implemented in the browser UI at
this checkpoint. The protocol-level recovery and rotation contracts are
documented in `vault-protocol-v1.md`; support must not represent those flows as
available until their UI and browser acceptance tests ship.

## Verification checklist

1. Run unit tests, typecheck, lint, and production build.
2. Reset local Supabase and run database/RLS tests.
3. Exercise first device with PRF and passphrase fallback, including expired
   session, malformed request, configuration error, database error, and
   IndexedDB failure after registration.
4. Exercise a second browser’s QR/SAS approval, rejection, expiry, and retry.
5. Confirm no logs, network requests, IndexedDB records, or support tickets
   contain recovery material, passphrases, PRF output, private keys, or raw
   challenge values.
