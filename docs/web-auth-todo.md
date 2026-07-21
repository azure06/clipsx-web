# Web authentication follow-up

The website implementation is complete. The remaining work is external configuration and end-to-end verification.

## Local Supabase test setup

- Configure `supabase/config.toml` with `site_url = "http://localhost:3000"` and allow `http://localhost:3000/auth/callback`.
- Enable `[auth.external.google]`; keep the Google client secret in an ignored root `.env` file through `env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET)`.
- In Google Cloud, allow `http://localhost:3000` as an origin and `http://127.0.0.1:54321/auth/v1/callback` as the local Google redirect URI.
- Run `npx supabase start`, then put its local API URL and publishable key—not any secret key—in `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Hosted Supabase and Google configuration

- Enable Google in the existing hosted ClipsX Supabase project and add its Google OAuth client credentials.
- Keep `clipsx://auth/callback` for desktop; add `https://<production-domain>/auth/callback` for web when the production domain is known.
- Add Supabase's hosted Google callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`) to the corresponding Google OAuth client.
- Rotate the previously exposed Supabase secret key. Do not add it back to the repository or website environment files.

## Manual acceptance checks

- Google login reaches the localized account page, shows the user email in the header, and survives a refresh.
- Missing, cancelled, or invalid callbacks return to sign-in with the generic retryable error.
- Sign-out clears the browser session; protected account and Stripe routes reject signed-out requests.
- Desktop and web can sign in as the same hosted Supabase user while retaining separate local credential stores/cookie sessions.

## Known project-wide check

`npm run typecheck` and `npm run build` pass. `npm run lint` still reports pre-existing, unrelated lint errors outside the web-auth changes.
