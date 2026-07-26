import { NextRequest, NextResponse } from 'next/server';

import { createDesktopPkceCallbackUrl } from '@/lib/auth/desktop-pkce-callback';

export const dynamic = 'force-dynamic';

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character]!);
}

export async function GET(request: NextRequest) {
  const desktopCallbackUrl = createDesktopPkceCallbackUrl(request.nextUrl.searchParams);
  const hasError = request.nextUrl.searchParams.has('error');
  const title = hasError ? 'Sign-in needs your attention' : 'Returning to ClipsX Desktop';
  const message = hasError
    ? 'ClipsX Desktop will show you what to do next.'
    : 'Your sign-in is complete. We’re handing you back to the app now.';
  const statusLabel = hasError ? 'Sign-in response received' : 'Sign-in complete';
  const statusClass = hasError ? 'status status-error' : 'status';
  const icon = hasError
    ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 21 20H3L12 3.5Z"/><path d="M12 9v4.5M12 17h.01"/></svg>`
    : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7"/></svg>`;
  const escapedUrl = escapeHtml(desktopCallbackUrl);
  const serializedUrl = JSON.stringify(desktopCallbackUrl).replace(/</g, '\\u003c');

  return new NextResponse(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#07111f" />
    <title>${title}</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f4f8fb;
        color: #102033;
      }

      * { box-sizing: border-box; }

      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
        overflow: hidden;
        background:
          radial-gradient(circle at 12% 12%, rgba(34, 211, 238, .16), transparent 30rem),
          radial-gradient(circle at 88% 88%, rgba(59, 130, 246, .13), transparent 28rem),
          #f4f8fb;
      }

      body::before {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        opacity: .4;
        background-image: linear-gradient(rgba(15, 23, 42, .035) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, .035) 1px, transparent 1px);
        background-size: 32px 32px;
        mask-image: linear-gradient(to bottom, black, transparent 80%);
      }

      .shell {
        position: relative;
        width: min(100% - 32px, 480px);
        padding: 12px;
      }

      .card {
        position: relative;
        overflow: hidden;
        padding: 44px 40px 36px;
        border: 1px solid rgba(148, 163, 184, .28);
        border-radius: 28px;
        background: rgba(255, 255, 255, .86);
        box-shadow: 0 24px 70px rgba(15, 23, 42, .12), 0 4px 14px rgba(15, 23, 42, .05);
        text-align: center;
        backdrop-filter: blur(18px);
      }

      .card::before {
        content: "";
        position: absolute;
        inset: 0 0 auto;
        height: 4px;
        background: linear-gradient(90deg, #22d3ee, #3b82f6);
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 36px;
        color: #102033;
        font-size: 14px;
        font-weight: 800;
        letter-spacing: .2em;
        text-transform: uppercase;
      }

      .brand-logo {
        display: block;
        width: 38px;
        height: 38px;
        filter: drop-shadow(0 8px 10px rgba(13, 71, 161, .2));
      }

      .status {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 18px;
        padding: 7px 11px;
        border: 1px solid rgba(6, 182, 212, .22);
        border-radius: 999px;
        color: #087f99;
        background: rgba(6, 182, 212, .08);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: .02em;
      }

      .status::before {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #06b6d4;
        box-shadow: 0 0 0 4px rgba(6, 182, 212, .12);
        content: "";
      }

      .status-error {
        border-color: rgba(245, 158, 11, .28);
        color: #a16207;
        background: rgba(245, 158, 11, .1);
      }

      .status-error::before {
        background: #f59e0b;
        box-shadow: 0 0 0 4px rgba(245, 158, 11, .13);
      }

      .icon {
        display: grid;
        width: 72px;
        height: 72px;
        margin: 0 auto 22px;
        place-items: center;
        border-radius: 22px;
        color: #0891b2;
        background: linear-gradient(145deg, rgba(207, 250, 254, .96), rgba(219, 234, 254, .96));
      }

      .icon svg { width: 34px; height: 34px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.8; }

      h1 {
        margin: 0;
        color: #0f1f33;
        font-size: clamp(25px, 5vw, 32px);
        line-height: 1.1;
        letter-spacing: -.04em;
      }

      p {
        max-width: 340px;
        margin: 14px auto 0;
        color: #587087;
        font-size: 15px;
        line-height: 1.65;
      }

      .loader {
        display: inline-flex;
        gap: 5px;
        margin: 25px 0 26px;
      }

      .loader span { width: 5px; height: 5px; border-radius: 50%; background: #22b8d2; animation: pulse 1.2s infinite ease-in-out; }
      .loader span:nth-child(2) { animation-delay: .15s; }
      .loader span:nth-child(3) { animation-delay: .3s; }

      @keyframes pulse { 0%, 60%, 100% { opacity: .3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }

      .fallback {
        display: block;
        padding-top: 20px;
        border-top: 1px solid rgba(148, 163, 184, .2);
        color: #087f99;
        font-size: 13px;
        font-weight: 700;
        text-decoration: none;
      }

      .fallback:hover { color: #075985; text-decoration: underline; text-underline-offset: 3px; }

      @media (prefers-color-scheme: dark) {
        :root { background: #07111f; color: #e5eef7; }
        body { background: radial-gradient(circle at 12% 12%, rgba(8, 145, 178, .16), transparent 30rem), radial-gradient(circle at 88% 88%, rgba(37, 99, 235, .16), transparent 28rem), #07111f; }
        body::before { opacity: .22; background-image: linear-gradient(rgba(148, 163, 184, .08) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, .08) 1px, transparent 1px); }
        .card { border-color: rgba(148, 163, 184, .18); background: rgba(15, 29, 48, .82); box-shadow: 0 24px 70px rgba(0, 0, 0, .34); }
        .brand, h1 { color: #f5faff; }
        .status { color: #67e8f9; background: rgba(6, 182, 212, .1); }
        .status-error { color: #fcd34d; background: rgba(245, 158, 11, .1); }
        .icon { color: #67e8f9; background: linear-gradient(145deg, rgba(8, 145, 178, .2), rgba(37, 99, 235, .2)); }
        p { color: #9bb0c5; }
        .fallback { border-color: rgba(148, 163, 184, .16); color: #67e8f9; }
        .fallback:hover { color: #a5f3fc; }
      }

      @media (max-width: 480px) {
        .card { padding: 36px 24px 28px; border-radius: 24px; }
        .brand { margin-bottom: 28px; }
      }

      @media (prefers-reduced-motion: reduce) {
        .loader span { animation: none; }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="card" aria-labelledby="page-title">
        <div class="brand">
          <svg class="brand-logo" viewBox="0 0 1920 1920" aria-hidden="true">
            <defs>
              <linearGradient id="clipsx-logo-gradient-a" x1="418.5" y1="731.8" x2="1592.5" y2="731.8" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#4A90E2" />
                <stop offset="1" stop-color="#0D47A1" />
              </linearGradient>
              <linearGradient id="clipsx-logo-gradient-b" x1="1517.2" y1="1173.9" x2="291.6" y2="1159" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#0D47A1" />
                <stop offset=".3" stop-color="#1565C0" />
                <stop offset=".6" stop-color="#1976D2" />
                <stop offset="1" stop-color="#42A5F5" />
              </linearGradient>
            </defs>
            <path fill="url(#clipsx-logo-gradient-a)" d="M1592.5 583.87c0-22.48-16.13-41.72-38.27-45.64L930.26 427.71l-1.08-.19l-456.23-80.8c-28.39-5.03-54.44 16.81-54.44 45.64v678.92c0 26.65 22.42 47.82 49.03 46.28l419.05-24.25c24.52-1.42 43.68-21.72 43.68-46.28V808.45c0-26.69 22.48-47.86 49.11-46.27l564.01 33.63c26.64 1.59 49.11-19.59 49.11-46.27V583.87z" />
            <path fill="url(#clipsx-logo-gradient-b)" d="M1243.94 836.57v212.87c0 20.91-16.29 38.2-37.17 39.45l-845.11 50.39c-20.88 1.24-37.17 18.54-37.17 39.45v315.63c0 24.58 22.21 43.2 46.41 38.91l873.03-154.62l.84-.15l262.51-46.49c18.87-3.34 32.63-19.75 32.63-38.91V849.13c0-20.94-16.33-38.24-37.24-39.45l-216.94-12.55C1263.06 795.81 1243.94 813.85 1243.94 836.57Z" />
          </svg>
          <span>ClipsX</span>
        </div>
        <div class="icon" aria-hidden="true">${icon}</div>
        <div class="${statusClass}">${statusLabel}</div>
        <h1 id="page-title">${title}</h1>
        <p>${message}</p>
        <div class="loader" aria-label="Opening ClipsX Desktop"><span></span><span></span><span></span></div>
        <a class="fallback" href="${escapedUrl}">Open ClipsX Desktop manually</a>
      </section>
    </main>
    <script>window.location.replace(${serializedUrl});</script>
  </body>
</html>`, {
    headers: {
      'cache-control': 'no-store',
      'content-security-policy': "default-src 'none'; script-src 'unsafe-inline'; base-uri 'none'; style-src 'unsafe-inline'",
      'content-type': 'text/html; charset=utf-8',
      'referrer-policy': 'no-referrer',
    },
  });
}
