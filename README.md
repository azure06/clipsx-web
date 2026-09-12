# ClipsX — Clipboard Manager with Semantic Search

ClipsX is a modern clipboard manager that intelligently saves and retrieves your clipboard history using semantic search. Built with Next.js, Supabase, and Stripe integration for premium features.

## Features

- **Semantic Search**: Find clipboard items by meaning, not just exact text matches
- **Pro Cloud Services**: End-to-end encrypted sync for deliberately saved items and shared collections
- **Authentication**: Secure user accounts with email/password and OAuth
- **Billing**: Stripe-integrated subscription management and payment processing
- **Multi-language**: Full i18n support (English, Japanese)
- **Responsive Design**: Works great on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **UI**: React 19, Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Payments**: Stripe
- **Internationalization**: next-intl
- **Styling**: TypeScript, ESLint, Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project (free tier available)
- Stripe account (for payment features)

### Environment Setup

1. Clone the repository
2. Create `.env.local` with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
STRIPE_SECRET_KEY=your_stripe_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_public_key
RESEND_API_KEY=re_replace_with_your_resend_api_key
RESEND_FROM="ClipsX <onboarding@resend.dev>"
RESEND_CONTACT_TO=support@example.com
```

`RESEND_API_KEY` is server-only. For local testing, Resend permits the
`onboarding@resend.dev` sender; replace it with an address on a verified domain
before public launch. `RESEND_CONTACT_TO` is the monitored support inbox.

3. Install dependencies:
```bash
npm install
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` — Start development server with Turbopack
- `npm run build` — Build for production
- `npm start` — Start production server
- `npm run lint` — Run ESLint
- `npm run typecheck` — TypeScript type checking
- `npm run stripe:listen` — Listen for Stripe webhooks locally

## Project Structure

```
src/
├── app/              # Next.js App Router pages
├── components/       # Reusable React components
├── config/          # Configuration files (site, navigation, pricing)
├── i18n/            # Internationalization setup
├── lib/             # Utilities and external integrations
└── types/           # TypeScript type definitions
```

## Execution plan

The v1 target is a public paid launch using Vercel, hosted Supabase, Stripe,
and desktop installers published by the separate ClipsX GitHub Releases
repository. Team billing is a later phase; browser-based E2EE vault access is
part of the v1 deployment scope.

Before deployment, complete this checklist:

- Replace the template Privacy Policy and Terms of Service with reviewed legal
  text, including company identity, jurisdiction, data handling, E2EE limits,
  subscriptions, refunds, deletion, and support contact details.
- Review English and Japanese content so every feature, Pro benefit, FAQ,
  download instruction, and AI statement matches the implemented desktop app.
- Connect the Download page to real versioned GitHub Release assets and verify
  signed installers or checksums for Windows, macOS, and Linux.
- Deliver an E2EE browser vault for a signed-in user's own passwords and
  encrypted notes. Supabase stores only ciphertext and key envelopes; the
  browser decrypts locally with Web Crypto.
- Treat the browser as a separately enrolled trusted device: generate a
  separate encryption and signing identity, persist only an
  AEAD-encrypted device-key bundle in IndexedDB, and unlock it locally
  with WebAuthn PRF or a separate vault passphrase. Direct persistence of a
  non-extractable `CryptoKey` is a lower-assurance compatibility profile, not
  the default. Obtain collection-key envelopes through trusted-device approval
  or recovery. Never send plaintext, recovery material, browser-unlock
  material, or a private key to the server.
- Secure the browser vault as a high-risk surface: use a strict CSP, avoid
  third-party scripts on vault routes, prevent XSS, avoid sensitive logging,
  clear local session state on sign-out, and test revocation/recovery. A
  non-extractable `CryptoKey` prevents export but does not protect against a
  malicious script executing on the ClipsX origin.
- Block duplicate Stripe subscriptions and route existing subscribers to the
  Customer Portal. Verify payment, cancellation, refund, retry, and failure
  flows in Stripe Test mode before enabling live prices.
- Connect the contact form to a monitored support inbox and add abuse
  protection; a successful API response must mean the message was delivered.
- Add the production Supabase, Google OAuth, Stripe webhook, Vercel, and
  desktop deep-link configuration.
- Complete the three planned blog articles and their localized metadata.
- Resolve all lint errors and keep unit tests, database tests, typecheck,
  production build, and CI passing.
- Run the final acceptance pass for web login, desktop login, downloads,
  account billing, localized pages, contact delivery, and webhook recovery.

Use [`docs/plan.md`](docs/plan.md) for the ordered launch
plan and current progress. See [`docs/backend/`](docs/backend/) for backend
architecture, billing, security, migration, and recovery procedures, and
the hosted-authentication and desktop OAuth configuration in the backend docs.

## Known Limitations

- Theme switching disabled due to Tailwind v4 + @tailwindcss/postcss dark mode CSS generation limitation
- Class-based dark mode variants not currently supported; awaiting Tailwind v4.4+ PostCSS plugin update

## License

MIT


## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### Production database release

See [release evidence and rationale](docs/backend/production-readiness.md).
Billing and desktop settings sync form the first-release configuration. The
browser vault is an explicit preview: `CLIPSX_VAULT_PREVIEW_ENABLED` defaults to
false and must remain unset/false in production while scoped sharing proofs are
unfinished. Set it to `true` only in an isolated preview environment.

Test the edited baseline without resetting existing development data:

```sh
python scripts/test-database-baseline.py --advisors --generate-types
```

After the first deployed release, set CI variable `MIGRATION_BASE_REF` to its
immutable tag/commit. Existing deployed SQL files must remain unchanged; append
new migrations and rehearse them on a populated staging restore. Never reset
production.
