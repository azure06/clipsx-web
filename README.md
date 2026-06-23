# ClipsX — Clipboard Manager with Semantic Search

ClipsX is a modern clipboard manager that intelligently saves and retrieves your clipboard history using semantic search. Built with Next.js, Supabase, and Stripe integration for premium features.

## Features

- **Semantic Search**: Find clipboard items by meaning, not just exact text matches
- **Cloud Sync**: Seamless synchronization across devices via Supabase
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
```

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

## Known Limitations

- Theme switching disabled due to Tailwind v4 + @tailwindcss/postcss dark mode CSS generation limitation
- Class-based dark mode variants not currently supported; awaiting Tailwind v4.4+ PostCSS plugin update

## License

MIT


## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
