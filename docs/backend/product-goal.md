# ClipsX Pro cloud backend: product goal

## Goal

Give a ClipsX user a private, durable cloud for intentionally saved clipboard
items, plus a clear paid Pro experience, without giving ClipsX the plaintext
of their saved content.

The backend must be safe to evolve. A customer may change billing interval,
upgrade to a future tier, lose a device, recover access, or later belong to a
Team account. The data model therefore separates identity, billing, access,
allowances, encrypted content, and sharing.

## What a user can do at launch

| Capability | Free | Pro |
| --- | --- | --- |
| Account and local ClipsX use | Yes | Yes |
| Encrypted personal cloud | Product limit | Higher product limit |
| Deliberately saved-item sync | Yes, within limit | Yes, within limit |
| Share a collection with a registered user | Product limit | Higher product limit |
| AI features | Product allowance | Higher monthly allowance |
| Manage payment method, plan, or cancellation | N/A | Stripe Customer Portal |

The exact limits are product configuration, not hard-coded database policy.
`plans` and `plan_features` contain the application meaning of Free and Pro;
Stripe Products and Prices contain the commercial representation.

## What this backend guarantees

- Billing access is determined from local entitlement state, so a normal app
  request does not depend on a live Stripe API call.
- Local state is derived from signed Stripe webhooks and regularly reconciled
  with Stripe. Stripe remains the commercial authority.
- A user cannot read another user's personal ciphertext through Supabase.
- A collection recipient receives a key envelope only for keys the owner chose
  to share. Acceptance is required before server-side collection access.
- A revoked device loses server-side access immediately because its active
  Supabase session is bound to the device record.
- Every database change is reviewed as a migration and verified locally before
  a hosted deployment.

## Deliberate v1 limitations

- No Team workspace, organization membership, seats, or pooled allowance UI.
  The billing-account boundary is present now so those can be added later.
- No purchasable AI credits, overages, or usage-based billing. A future higher
  tier is the intended first expansion path.
- No arbitrary file attachments or native Office-document syncing.
- A user who already downloaded ciphertext cannot be made to forget it when
  removed from a collection. Key rotation protects new writes only.
- Device loss is handled through recovery. It does not automatically re-wrap
  every historical key for every remaining device.
- Only registered ClipsX users can be invited in v1; email-only invitations are
  not an encrypted-key-distribution mechanism.
- Stripe Tax is off until a tax advisor confirms registrations and a correct
  Stripe product tax code. Enabling automatic tax without an active
  registration can silently collect no tax.

## Success criteria

The backend is ready for the next implementation phase when a clean local
environment can create a user, establish a personal billing account, receive
and idempotently project a Stripe sandbox subscription, grant Pro access,
create an encrypted collection, and prove via RLS tests that another user
cannot access it.
