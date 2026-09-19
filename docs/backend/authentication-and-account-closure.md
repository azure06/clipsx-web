# Authentication and account closure

The authenticated account settings page uses a wide, responsive workspace. Its
section navigation sits beside the content on desktop and becomes a horizontal
picker on smaller screens. The settings shell is intentionally unboxed; cards
are reserved for individual settings groups so controls retain usable width and
the hierarchy does not become a card nested inside another card.
The desktop navigation separates Profile, Account, Billing, and Vault into four
groups. Profile is the default section. Profile photo, display name, username,
language, and time-zone controls are visible but disabled as planned work.
The page adds 24px of top spacing on mobile and 32px on larger screens after
the shared layout's header offset, with 24px between the title and settings.

On `/account`, the Account section contains the signed-in email, sign-out
action, and the working account-deletion confirmation. Password changes,
connected sign-in methods, and active-session management are visible but
disabled as planned work. Plan and billing controls
live in their own shared `Billing` section. The workspace whose plan is displayed
is chosen with the shared Radix-backed settings select control, which renders a
consistent custom menu instead of the platform-native dropdown. A successful
checkout opens this section while entitlement activation is polled.
These groups share the same content column, card padding, and section spacing.
The page supplies its account content to the shared settings shell
instead of rendering its placeholder Account section plus a duplicate billing
card. Account actions appear only in the Account section, not below other
settings sections. Checkout activation polling and closure requirements remain
unchanged. Other settings-shell consumers retain their existing section content.

## Providers and redirects

The website supports email/password, Google, and GitHub through Supabase Auth.
The client passes only allowlisted providers. The callback exchanges the PKCE
code server-side and accepts only locale-qualified account destinations.
Arbitrary and protocol-relative `next` URLs are rejected.

Production must enable Google and GitHub in Supabase and configure their client
IDs and secrets. Allow only the exact deployed web callback, hosted desktop PKCE
bridge, and reviewed local development URLs. Provider secrets and the Supabase
service-role key remain server-only. Verify all three sign-in methods, denied and
expired callbacks, locale preservation, desktop deep links, and leaked-password
protection before release.

## Closure API and recovery

`GET /api/account` returns an authenticated closure preflight. `DELETE
/api/account` requires `{ "confirmation": "DELETE", "cancelSubscriptions":
true }`, a live session ID, and authentication no older than ten minutes. Stable
codes are `UNAUTHORIZED`, `REAUTHENTICATION_REQUIRED`, `CONFIRMATION_REQUIRED`,
`ACTIVE_SUBSCRIPTION`, `ORGANIZATION_OWNER`, `CLOSURE_PENDING`, and
`CLOSURE_FAILED`.

The route never trusts user metadata for authorization. Owned organizations
block closure. Active Stripe subscriptions are canceled first; closure remains
pending until verified webhook projection records cancellation, so retries are
safe. `private.close_account(uuid)` then locks affected records, closes the
principal, bans the Auth user, removes sessions and sync state, deletes owned
vault data, revokes devices and recovery keys, fences foreign-owned shared
collections for rotation, and closes billing state. Local desktop data must be
removed separately on each device.
