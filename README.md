# TradeDemo

TradeDemo is a **demo-only** practice platform. Account balances are virtual, and the default market feed is simulated. It does not provide real-money trading, deposits, withdrawals, or payouts.

## Local setup

Requirements: Node.js 20+, npm, and Docker.

```bash
npm install
cp .env.example .env
npm run db:up
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

The app runs at <http://localhost:3000>. Registration creates a demo account with $10,000 virtual USD, and demo email verification is optional by default so a missing email provider cannot block demo signup or trading. If enabled, configure Resend using `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_APP_URL`, then set `EMAIL_VERIFICATION_REQUIRED=true`. In development, verification and reset links are printed to the server console.

To stop the local database, run `npm run db:down`. The local database volume is retained. Alternatively, use `docker compose up -d postgres`.

## Demo product areas

- `/` is the public landing page with an animated live-feed hero chart, a sliding price ticker, features, contract explainers, and an FAQ. `/trade` shows the practice terminal and allows visitors to inspect quotes before signing in.
- The brand covers 12 simulated instruments quoted by symbol: the six major FX pairs, XAU/USD, XAG/USD, BTC/USD, ETH/USD, XRP/USD and SOL/USD (legacy `Gold/USD` rows still resolve against the feed).
- Signed-in users can place manual demo trades or run the auto demo, which trades five short-duration positions with randomized sides (Over/Under/Up/Down) and digits so outcomes vary. Auto mode only runs while the terminal is open and stops after five trades. Auto trades run on a 15s expiry by default (manual expiries from 10s to 2m).
- Digit Over/Under is balanced to a 50/50 win rate: Over wins when the price indicator is at or above your digit, Under wins when it is strictly below, and ties belong to Over. Results are still settled on the server from the displayed expiry price.
- Trade outcomes are settled on the server by comparing the entry and expiry quotes (digit indicator for digit match and digit over/under). The terminal draws a bold live price line with a moving marker, shows open trades as progress guides on the chart, labels each settled position at its point on the chart (+profit in green / −stake in red), and offers graph toggles (grid, area fill, markers, ball pulse). `/trades` contains the full history.
- `/finance` (also `/transactions`) displays the demo and real (sandbox) balances and virtual account activity. It is not a cash statement.
- The app has no live-account or real-money trade capability. Deposits/withdrawals move only the real (sandbox) balance pool; by default the simulated provider completes them instantly, and an optional Daraja M-Pesa sandbox provider can be enabled with `PAYMENT_PROVIDER="daraja"`. Do not represent simulated prices, balances, or outcomes as live financial services.

## Security and account features

- Registration creates the account and initial ledger records transactionally.
- Email verification and password-reset tokens are single-use, hashed in the database, and expire after 30 minutes.
- When email verification is explicitly required, login and trade placement are gated on a verified address. For demo-only local setup it is off by default.
- Password reset revokes all existing sessions.
- Authenticator-based 2FA uses TOTP with an AES-256-GCM-encrypted secret. Configure `TOTP_ENCRYPTION_KEY` (32 random bytes, hex) before enabling it.
- Production transactional email uses the Resend API. Configure `RESEND_API_KEY`, `EMAIL_FROM`, and an HTTPS `NEXT_PUBLIC_APP_URL`.
- Monetary values in the database use PostgreSQL Decimal. Trade placement uses conditional balance updates and serializable transactions.

## Market data and realtime updates

When `MARKET_DATA_URL` is unset, the app reports `SIMULATED MARKET DATA` and uses the deterministic demo price engine. To connect an approved market-data service, set `MARKET_DATA_URL` and `MARKET_DATA_API_KEY`. The configured endpoint must accept `?asset=EUR%2FUSD` and return a JSON quote such as:

```json
{"asset":"EUR/USD","price":"1.08342","timestamp":"2026-10-06T10:00:00.000Z"}
```

The adapter rejects mismatched assets, invalid prices, and quotes older than one minute. Provider failures return an unavailable error; they never fall back to simulated values while a live provider is configured. API credentials remain server-side.

Authenticated dashboards receive server-sent events (SSE) for prices, account balance, and trade status. This is a server-to-browser streaming transport supported by Next.js deployments; it is not a WebSocket endpoint.

## Payments and KYC

Real-money deposits, withdrawals, and payouts are intentionally disabled. Payments only move the real (sandbox) balance pool, which is virtual. The default simulated provider completes deposits/withdrawals instantly for demos and presentations. To test the Daraja M-Pesa sandbox flow instead, set `PAYMENT_PROVIDER="daraja"` with `MPESA_*` sandbox credentials; even then no real funds move. Do not enable true money movement by setting any environment variable.

The schema has a future KYC status/submission structure, but this demo does not collect or store identity documents. Production identity verification must use an appropriately approved hosted KYC provider and compliant, access-controlled document storage.

Before considering any real-money feature, obtain jurisdiction-specific legal and financial authorization, payment-provider approval, KYC/AML controls, independent security review, reconciliation and dispute procedures, data-protection review, and responsible-use controls. This repository does not establish that readiness.

## Commands

```bash
npm run dev
npm run db:up
npm run db:down
npm run type-check
npm run lint
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate
npm run build
npm start
```

## Deploying to Vercel with a Supabase database

The app talks to the database exclusively through Prisma (`prisma-client-js`). Pointing it at Supabase is just a `DATABASE_URL` change — the code and the rest of the app (sessions, auth, balances, trades, payments) keep working because all storage lives in the Postgres schema.

1. **Get the connection string.** Supabase Dashboard → Project Settings → Database → Connection string → copy the **Session pooler** URI (host `<ref>.pooler.supabase.com`, port `5432`, database `postgres`). It embeds the database password you set when creating the project. If you no longer know the password, reset it with "Reset database password" in the same screen.
2. **Apply the migrations** to Supabase:
   ```bash
   DATABASE_URL="<session-pooler-uri>" npm run prisma:deploy
   ```
   `npm run prisma:deploy` runs `prisma migrate deploy`, which replays every migration from `prisma/migrations` and is safe to run on an empty database. The schema (accounts, balances, sessions, ledger, payments, `TradeMode`, etc.) is created automatically.
3. **Set the environment variables on Vercel** (Project → Settings → Environment Variables, production + preview):
   - `DATABASE_URL` — the same Session pooler URI used above.
   - `NEXT_PUBLIC_APP_URL` — the deployed `https://<project>.vercel.app` URL.
   - `NEXT_PUBLIC_SUPABASE_URL` — `https://<project-ref>.supabase.co`.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — for the Supabase API/Realtime if used later (optional; not required by the Prisma path).
   - `EMAIL_VERIFICATION_REQUIRED="true"` with `RESEND_API_KEY` + `EMAIL_FROM` when verification email is wanted, `TOTP_ENCRYPTION_KEY` if 2FA will be used, and any `MPESA_*` vars if Daraja sandbox mode is enabled.
4. **Deploy on Vercel.** `npm run build` runs `prisma generate` automatically via the `postinstall` hook, so the client matches the schema on every deploy. No server is required — Vercel serverless functions connect directly to the Supabase pooler, and the SSE price stream (`/api/stream`) works over the regular Next.js route.

Notes:
- Use the **session pooler** (port 5432) as `DATABASE_URL`; Prisma works with it without `pgbouncer=true`. Avoid the direct host (`db.<ref>.supabase.co`) for serverless workloads.
- Vercel filesystem is ephemeral and serverless functions are short-lived, so in-memory data like the simulated-price history resets between cold starts. Balances, trades, and history all live in Supabase and persist.
- `.env` files stay on your machine (gitignored); `.env.example` has placeholders for the deploy values.

The Vercel/Vite build log mentioning `Eduvia`, `src/components/AppShell.jsx`, and `src/data/content.js` is from a different repository than this Next.js checkout and cannot be repaired by changing TradeDemo files. Check out the matching `Eduvia` repository to fix those unresolved imports.
