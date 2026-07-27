# Web authentication follow-up

The website implementation is complete. The remaining work is external configuration and end-to-end verification.

## Local Supabase test setup

- Configure `supabase/config.toml` with `site_url = "http://localhost:3000"` and allow both `http://localhost:3000/auth/callback` and `http://localhost:3000/auth/desktop/callback`.
- Enable `[auth.external.google]`; keep the Google client secret in an ignored root `.env` file through `env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET)`.
- In Google Cloud, allow `http://localhost:3000` as an origin and `http://127.0.0.1:54321/auth/v1/callback` as the local Google redirect URI.
- Run `npx supabase start`, then put its local API URL and publishable key—not any secret key—in `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Hosted Supabase and Google configuration

- Enable Google in the existing hosted ClipsX Supabase project and add its Google OAuth client credentials.
- Allow `https://clipsx.app/auth/callback` and `https://clipsx.app/auth/desktop/callback` in the hosted Supabase project's redirect URLs. Keep `clipsx://auth/callback` registered for the desktop app.
- Add Supabase's hosted Google callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`) to the corresponding Google OAuth client.
- Rotate the previously exposed Supabase secret key. Do not add it back to the repository or website environment files.

## Manual acceptance checks

- Google login reaches the localized account page, shows the user email in the header, and survives a refresh.
- Missing, cancelled, or invalid callbacks return to sign-in with the generic retryable error.
- Sign-out clears the browser session; protected account and Stripe routes reject signed-out requests.
- Desktop and web can sign in as the same hosted Supabase user while retaining separate local credential stores/cookie sessions.

## Desktop PKCE browser handoff

The desktop app owns PKCE: it generates and stores its verifier in secure OS
storage, calls `signInWithOAuth` with `skipBrowserRedirect: true`, and uses
`https://clipsx.app/auth/desktop/callback` as `redirectTo`. It opens the
returned Supabase URL in the system browser.

`/auth/desktop/callback` is deliberately a bridge, not a website login
callback. It forwards only the unexchanged PKCE `code`, `state`, or OAuth error
fields to the fixed `clipsx://auth/callback` deep link. It never creates a
website session. The browser briefly shows a branded handoff screen while it
opens the deep link; if the operating system does not open ClipsX automatically,
the screen provides a manual "Open ClipsX Desktop" link. The desktop then calls
`exchangeCodeForSession(code)` using its original verifier.

Desktop browser sign-in supports Google OAuth initially. Website password
login remains browser-only; native password login or website-to-device pairing
is a later feature. Desktop installers must register `clipsx://auth/callback`
on Windows, macOS, and Linux.

## Known project-wide check

As of 2026-07-27, a clean local install passes typecheck, unit tests, the local
Supabase pgTAP/RLS suite, lint, and production build. The GitHub Actions
workflow now runs the applicable checks on pull requests and pushes; its first
remote run remains a deployment-gate verification item in
[`../launch-plan.md`](launch-plan.md).
